/**
 * app.js — HTTP API Entry Point
 *
 * Thin Express layer over the pipeline orchestrator.
 * Each POST /reports request:
 *   1. Creates a DB record (returns reportId immediately — async job)
 *   2. Enqueues the pipeline in the background
 *   3. Client polls GET /reports/:id for status
 *
 * Authentication: Bearer token (tenant lookup via token → tenantId)
 * Rate limiting: 10 concurrent pipeline runs per tenant
 *
 * This file intentionally contains no business logic —
 * everything is delegated to orchestrator.js.
 */

import express         from 'express';
import cors            from 'cors';
import multer          from 'multer';
import { v4 as uuidv4 }  from 'uuid';
import { query }         from './db/client.js';
import { seedPrompts }   from './prompts/registry.js';
import { runPipeline, resumePipeline } from './pipeline/orchestrator.js';
import { verifyReport }  from './safety/outputSigner.js';
import { runPresentationJob } from './canva/presentationJob.js';
import { runDesignGeneration } from './canva/designGenerator.js';
import { ensureCanvaToken } from './middleware/canvaToken.middleware.js';
import { ensureCanvaMcpToken } from './middleware/canvaMcpToken.middleware.js';
import canvaRouter from './routes/canva.routes.js';
import canvaMcpRouter from './routes/canvaMcp.routes.js';
import authRouter from './routes/auth.routes.js';
import { authenticate } from './middleware/auth.middleware.js';
import { uploadToS3 } from './services/s3Service.js';

const app    = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },   // 20 MB per image
  fileFilter(_, file, cb) {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const allowedOriginPatterns = [
  /^https:\/\/[a-z0-9]+\.cloudfront\.net$/,
];

app.use(cors({
  origin(origin, callback) {
    // allow non-browser tools like curl/postman with no Origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || allowedOriginPatterns.some(p => p.test(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));
app.use(express.json());
app.use('/auth', authRouter);
app.use('/canva', canvaRouter);
app.use('/canva-mcp', canvaMcpRouter);

// ─── POST /projects — Create a new project ─────────────────────────────

app.post('/projects', authenticate, async (req, res) => {
  const { brand_input, brand } = req.body;

  // Input validation
  if (!brand || typeof brand !== 'string') {
    return res.status(400).json({ error: 'brand (string) is required' });
  }
  if (!brand_input || typeof brand_input !== 'string') {
    return res.status(400).json({ error: 'brand_input (string) is required' });
  }

  // Create DB record synchronously — return projectId immediately
  const id = uuidv4();
  const now = new Date();

  try {
    await query(
      `INSERT INTO projects
        (id, tenant_id, brand_name, brand_dna_raw, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [id, req.tenantId, brand, brand_input, now]
    );

    res.status(200).json({
      projectId: id,
      brandName: brand,
      brandDDna: brand_input,
      created_at: now,
    })
  } catch (error) {
    console.error('[App] POST /projects error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /projects — Get user's projects ────────────────────────────────────

app.get('/projects', authenticate, async (req, res) => {
  const result = await query(
    `SELECT id, brand_name, brand_dna_raw, created_at
     FROM projects
     WHERE tenant_id = $1`,
    [req.tenantId]
  );

  res.json(result.rows.map((row) => ({
    projectId:    row.id,
    brandName:    row.brand_name,
    brandDna:     row.brand_dna_raw,
    createdAt:    row.created_at,
  })));
});

// ─── GET /projects/:id — Get project by ID ────────────────────────────────────

app.get('/projects/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, brand_name, brand_dna_raw, created_at
     FROM projects
     WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const row = result.rows[0];

  res.json({
    projectId: row.id,
    brandName:  row.brand_name,
    brandDna:   row.brand_dna_raw,
    createdAt:  row.created_at,
  });
});

// ─── GET /projects/:projectId/reports — List reports for a project ────────────
app.get('/projects/:projectId/reports', authenticate, async (req, res) => {
  const { projectId } = req.params;

  const proj = await query(
    `SELECT id FROM projects WHERE id = $1 AND tenant_id = $2`,
    [projectId, req.tenantId]
  );
  if (proj.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const result = await query(
    `SELECT id, status, error, brand_dna, report_json, integrity, created_at, completed_at
     FROM reports
     WHERE project_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [projectId, req.tenantId]
  );

  res.json(result.rows.map(row => ({
    report_id:    row.id,
    status:       row.status,
    error:        row.error ?? undefined,
    brand_dna:    row.brand_dna,
    report:       row.status === 'done' ? row.report_json  : undefined,
    integrity:    row.status === 'done' ? row.integrity    : undefined,
    created_at:   row.created_at,
    completed_at: row.completed_at ?? undefined,
  })));
});

// ─── POST /reports — Create and run a new report ─────────────────────────────
// Supports two modes:
//   • Handles mode:  JSON body with { brand, brand_input, handles[] }
//   • Upload mode:   multipart/form-data with fields brand + brand_input and image files
//                    (handles omitted; Instagram handles are identified via Claude Vision)

app.post('/reports', authenticate, upload.any(), async (req, res) => {
  const { brand_input, brand, handles, keep_handles = false, prompt_versions = {}, sync = false, project_id } = req.body;

  const uploadedFiles = req.files ?? [];
  const isUploadMode  = uploadedFiles.length > 0;

  // Input validation — shared
  if (!brand || typeof brand !== 'string') {
    return res.status(400).json({ error: 'brand (string) is required' });
  }
  if (!brand_input || typeof brand_input !== 'string') {
    return res.status(400).json({ error: 'brand_input (string) is required' });
  }

  // Input validation — mode-specific
  if (isUploadMode) {
    if (uploadedFiles.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 images per report' });
    }
  } else {
    const parsedHandles = typeof handles === 'string' ? JSON.parse(handles) : handles;
    if (!Array.isArray(parsedHandles) || parsedHandles.length === 0) {
      return res.status(400).json({ error: 'handles (non-empty array) is required when no images are uploaded' });
    }
    if (parsedHandles.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 handles per report' });
    }
  }

  const resolvedHandles = isUploadMode
    ? []
    : (typeof handles === 'string' ? JSON.parse(handles) : handles);

  // Validate project_id belongs to this tenant (if provided)
  const resolvedProjectId = project_id ?? null;
  if (resolvedProjectId) {
    const proj = await query(
      `SELECT id FROM projects WHERE id = $1 AND tenant_id = $2`,
      [resolvedProjectId, req.tenantId]
    );
    if (proj.rows.length === 0) {
      return res.status(400).json({ error: 'project_id not found or does not belong to this tenant' });
    }
  }

  // Create DB record synchronously — return reportId immediately
  // handles column is empty for upload mode; orchestrator fills it post-analysis
  const reportId = uuidv4();
  await query(
    `INSERT INTO reports
       (id, tenant_id, project_id, project_name, brand, brand_dna, brand_raw_input, handles, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
    [
      reportId,
      req.tenantId,
      resolvedProjectId,
      brand_input.slice(0, 80),
      brand,
      JSON.stringify({}),
      brand_input,
      resolvedHandles,
    ]
  );

  // Upload images to S3 (upload mode only) — best-effort, partial failure is non-blocking
  let imageS3Keys = [];
  if (isUploadMode && uploadedFiles.length > 0) {
    const results = await Promise.allSettled(
      uploadedFiles.map(file => uploadToS3(reportId, file)),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        imageS3Keys.push(result.value.key);
      } else {
        console.error(`[App] S3 upload failed for report ${reportId}:`, result.reason?.message);
      }
    }
  }

  const pipelineParams = {
    reportId,
    tenantId:      req.tenantId,
    brand,
    brandRawInput: brand_input,
    handles:       resolvedHandles,
    uploadedFiles: isUploadMode ? uploadedFiles : undefined,
    imageS3Keys,
    keepHandles:   keep_handles === 'true' || keep_handles === true,
    promptVersions: typeof prompt_versions === 'string' ? JSON.parse(prompt_versions) : prompt_versions,
    sync:          sync === 'true' || sync === true,
  };

  // Kick off pipeline asynchronously — do not await
  // sync=true is passed through to analyzeJob to use direct API calls instead of Batch API
  runPipeline(pipelineParams).catch(err => {
    console.error(`[App] Pipeline error for ${reportId}:`, err.message);
  });

  res.status(202).json({
    report_id:  reportId,
    status:     'pending',
    poll_url:   `/reports/${reportId}`,
  });
});

// ─── GET /reports/:id — Poll report status ────────────────────────────────────

app.get('/reports/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, status, error, brand_dna, report_json, integrity, created_at, completed_at
     FROM reports
     WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const row = result.rows[0];

  // For completed reports, verify integrity before returning
  // if (row.status === 'done' && row.report_json) {
  //   const check = verifyReport(row.report_json);
  //   if (!check.valid) {
  //     console.error(`[App] Integrity check failed for report ${id}: ${check.reason}`);
  //     return res.status(500).json({
  //       error:  'Report integrity check failed',
  //       reason: check.reason,
  //     });
  //   }
  // }

  res.json({
    report_id:    row.id,
    status:       row.status,
    error:        row.error ?? undefined,
    brand_dna:    row.brand_dna,
    report:       row.status === 'done' ? row.report_json  : undefined,
    integrity:    row.status === 'done' ? row.integrity    : undefined,
    created_at:   row.created_at,
    completed_at: row.completed_at ?? undefined,
  });
});

// ─── GET /reports/:id/audit — Job audit trail ─────────────────────────────────

app.get('/reports/:id/audit', authenticate, async (req, res) => {
  const { id } = req.params;

  // Verify ownership first
  const ownerCheck = await query(
    `SELECT id FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );
  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const result = await query(
    `SELECT job_name, status, input_hash, output_hash, started_at, ended_at, error
     FROM job_audit
     WHERE report_id = $1
     ORDER BY started_at ASC`,
    [id]
  );

  res.json({ report_id: id, jobs: result.rows });
});

// ─── POST /reports/:id/resume — Resume a failed pipeline ─────────────────────

app.post('/reports/:id/resume', authenticate, async (req, res) => {
  const { id } = req.params;
  const { prompt_versions = {} } = req.body ?? {};

  // Pre-check: report must exist, belong to tenant, and be failed
  const check = await query(
    `SELECT status FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );
  if (check.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }
  if (check.rows[0].status !== 'failed') {
    return res.status(409).json({
      error: `Cannot resume report with status "${check.rows[0].status}" — only "failed" reports can be resumed`,
    });
  }

  // Fire and forget — client polls GET /reports/:id
  resumePipeline({
    reportId:       id,
    tenantId:       req.tenantId,
    promptVersions: prompt_versions,
  }).catch(err => {
    console.error(`[App] Resume pipeline error for ${id}:`, err.message);
  });

  res.status(202).json({
    report_id: id,
    status:    'running',
    message:   'Pipeline resuming from last checkpoint',
    poll_url:  `/reports/${id}`,
  });
});

// ─── POST /reports/:id/presentation — Start Canva presentation flow ─────────

app.post('/reports/:id/presentation', authenticate, ensureCanvaToken, async (req, res) => {
  const { id } = req.params;

  // Verify report exists, belongs to tenant, and is done
  const check = await query(
    `SELECT status, report_json, handle_map FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );
  if (check.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }
  if (check.rows[0].status !== 'done') {
    return res.status(409).json({
      error: `Report status is "${check.rows[0].status}" — presentation requires a completed report`,
    });
  }

  const report    = check.rows[0].report_json;
  const handleMap = check.rows[0].handle_map ?? {};

  // Create presentation request
  const presId = uuidv4();
  await query(
    `INSERT INTO presentation_requests (id, report_id, tenant_id, status)
     VALUES ($1, $2, $3, 'pending')`,
    [presId, id, req.tenantId]
  );

  // Fire and forget
  runPresentationJob({
    presentationId: presId,
    reportId:       id,
    tenantId:       req.tenantId,
    report,
    handleMap,
  }, req.canvaToken).catch(err => {
    console.error(`[App] Presentation job error for ${presId}:`, err.message);
  });

  res.status(202).json({
    presentation_id: presId,
    status:          'pending',
    poll_url:        `/reports/${id}/presentation`,
  });
});

// ─── GET /reports/:id/presentation — Poll presentation status ────────────────

app.get('/reports/:id/presentation', authenticate, ensureCanvaToken, async (req, res) => {
  const { id } = req.params;

  // Verify report ownership
  const ownerCheck = await query(
    `SELECT id FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );
  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const result = await query(
    `SELECT id, status, query_text, manifest, candidates, canva_design_url, error, created_at, updated_at
     FROM presentation_requests
     WHERE report_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No presentation request found for this report' });
  }

  const row = result.rows[0];

  res.json({
    presentation_id: row.id,
    status:          row.status,
    query_text:      ['ready', 'generating', 'creating_design', 'approved'].includes(row.status) ? row.query_text   : undefined,
    manifest:        ['ready', 'generating', 'creating_design', 'approved'].includes(row.status) ? row.manifest      : undefined,
    candidates:      row.candidates     ?? undefined,
    canva_design_url: row.canva_design_url ?? undefined,
    error:           row.error          ?? undefined,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
  });
});

// ─── POST /reports/:id/presentation/generate — Trigger Canva design generation

app.post('/reports/:id/presentation/generate', authenticate, ensureCanvaMcpToken, async (req, res) => {
  const { id } = req.params;

  // Verify report ownership
  const ownerCheck = await query(
    `SELECT id FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );
  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }

  // Find the latest presentation request
  const presResult = await query(
    `SELECT id, status, query_text, manifest FROM presentation_requests
     WHERE report_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [id]
  );
  if (presResult.rows.length === 0) {
    return res.status(404).json({ error: 'No presentation request found for this report' });
  }

  const pres = presResult.rows.find((pres) => pres.status === 'ready');
  if (pres.status !== 'ready') {
    return res.status(409).json({
      error: `Presentation status is "${pres.status}" — can only generate when status is "ready"`,
    });
  }

  // Fire and forget
  runDesignGeneration({
    presentationId: pres.id,
    reportId:       id,
    queryText:      pres.query_text,
    manifest:       pres.manifest,
  }).catch(err => {
    console.error(`[App] Design generation error for ${pres.id}:`, err.message);
  });

  res.status(202).json({
    presentation_id: pres.id,
    status:          'generating',
    poll_url:        `/reports/${id}/presentation`,
  });
});

// ─── POST /reports/:id/presentation/approve — Approve and finalize ───────────

app.post('/reports/:id/presentation/approve', authenticate, ensureCanvaToken, async (req, res) => {
  const { id } = req.params;
  const { canva_design_url } = req.body;

  if (!canva_design_url || typeof canva_design_url !== 'string') {
    return res.status(400).json({ error: 'canva_design_url (string) is required' });
  }

  // Verify report ownership
  const ownerCheck = await query(
    `SELECT id FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenantId]
  );
  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }

  // Find the latest presentation request
  const presResult = await query(
    `SELECT id, status FROM presentation_requests
     WHERE report_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [id]
  );
  if (presResult.rows.length === 0) {
    return res.status(404).json({ error: 'No presentation request found for this report' });
  }

  const pres = presResult.rows[0];
  if (pres.status !== 'ready' && pres.status !== 'approved') {
    return res.status(409).json({
      error: `Presentation status is "${pres.status}" — can only approve when status is "ready" or "approved"`,
    });
  }

  // Update presentation request + report
  await query(
    `UPDATE presentation_requests
     SET status = 'approved', canva_design_url = $2, updated_at = NOW()
     WHERE id = $1`,
    [pres.id, canva_design_url]
  );

  await query(
    `UPDATE reports SET canva_url = $2 WHERE id = $1`,
    [id, canva_design_url]
  );

  res.json({
    status:          'approved',
    canva_design_url,
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Startup ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3300;

app.listen(PORT, async () => {
  // Ensure dev tenant exists in tenants table (idempotent)
  const devTenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000000';
  await query(
    `INSERT INTO tenants (id, name, plan)
     VALUES ($1, 'dev', 'starter')
     ON CONFLICT (id) DO NOTHING`,
    [devTenantId]
  );

  await seedPrompts();     // Idempotent — registers current prompt versions
  console.log(`\n[App] Audience Intelligence API running on :${PORT}`);
  console.log(`[App] Prompts seeded`);
});

export default app;