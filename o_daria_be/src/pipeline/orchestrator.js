/**
 * orchestrator.js — Pipeline Orchestrator
 *
 * Coordinates the full job chain for a single report request.
 *
 * Design: Deterministic Orchestrator + Parallel Workers + Validation Gates
 *
 * The routing is intentionally NOT dynamic — marketing teams need predictable,
 * auditable outputs. Intelligence lives INSIDE each job node, not in routing.
 *
 * The one exception: ValidationError triggers a ClarificationAgent re-run
 * for the specific failed step, with enriched context. This is the only
 * adaptive routing decision in the pipeline.
 *
 * Job chain:
 *   1. compileBrandDna    — free text → structured brand DNA object
 *   2. fetchProfiles      — Apify scrape → S3 images + captions (parallel)
 *   3. analyzeProfiles    — Batch API analysis with cache + RAG calibration
 *   4. aggregateReport    — Synthesis with segment library calibration
 *   5. [optional] clarify — Re-run failed step with enriched context
 *   6. signAndPersist     — Integrity signing + DB write
 *
 * All state mutations go through the reports table.
 * All job events are recorded in job_audit.
 */

import { runAnalyzeJob }      from './jobs/analyzeJob.js';
import { runAggregateJob }    from './jobs/aggregateJob.js';
import { runValidation, ValidationError } from './jobs/validateJob.js';
import { auditJob }           from './jobs/auditTrail.js';
import { query }              from '../db/client.js';
import { validateHandle }     from '../safety/inputSanitizer.js';
import { fetchProfiles }      from './jobs/fetchJob.js';

const MAX_CLARIFICATION_RETRIES = 1;   // only one clarification pass per job

// Pipeline step order — used for resume logic
const STEP_ORDER = ['fetch', 'analyze', 'aggregate'];

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Runs the full pipeline for a report request.
 *
 * @param {object}   params
 * @param {string}   params.reportId        - Pre-created DB record UUID
 * @param {string}   params.tenantId        - Tenant UUID
 * @param {string}   params.brand           - Brand identifier (e.g. "Vysota890")
 * @param {string}   params.brandRawInput   - Free text brand description
 * @param {string[]} [params.handles]       - Instagram handles to analyze (scraper mode)
 * @param {object[]} [params.uploadedFiles]  - Raw multer file objects; skips fetch, identify+analyze in one Vision pass
 * @param {boolean}  params.keepHandles     - Tenant opted into plaintext handle storage
 * @param {object}   params.promptVersions  - Pinned prompt versions (optional, defaults to 'latest')
 */
export async function runPipeline({
  reportId,
  tenantId,
  brand,
  handles,
  uploadedFiles,
  keepHandles = false,
  promptVersions = {},
  sync = false,
}) {
  const isUploadMode = Array.isArray(uploadedFiles) && uploadedFiles.length > 0;

  console.log(`\n[Orchestrator] Starting pipeline for report ${reportId}`);
  console.log(`  Tenant:   ${tenantId}`);
  console.log(`  Mode:     ${isUploadMode ? 'upload' : 'scraper'}`);

  try {
    await setReportStatus(reportId, 'running');

    // ── Step 1: Validate + sanitize handles (scraper mode only) ──────────
    const validatedHandles = isUploadMode
      ? []
      : (handles ?? []).map(h => {
          try {
            return validateHandle(h);
          } catch (err) {
            console.warn(`  [Orchestrator] Skipping invalid handle "${h}": ${err.message}`);
            return null;
          }
        }).filter(Boolean);

    if (!isUploadMode && validatedHandles.length === 0) {
      throw new Error('No valid Instagram handles provided');
    }

    const checkpointState = { validatedHandles, brand, keepHandles };

    // ── Step 2: Fetch profiles (scraper mode only) ────────────────────────
    let profileData;
    if (!isUploadMode) {
      console.log('\n[Orchestrator] Step 1/3: Fetching profiles...');
      profileData = await fetchProfiles(validatedHandles, reportId);
      console.log(`  Fetched ${profileData.length} profiles`);
      await saveCheckpoint(reportId, 'fetch', { ...checkpointState, profileData });
    }

    // ── Step 3: Analyze profiles ──────────────────────────────────────────
    console.log(`\n[Orchestrator] Step ${isUploadMode ? '1' : '2'}/3: Analyzing profiles...`);
    const analyses = await withClarificationRetry(
      () => runAnalyzeJob({
        reportId,
        tenantId,
        profiles:      profileData,
        uploadedFiles: isUploadMode ? uploadedFiles : undefined,
        promptVersion: promptVersions.analysis ?? 'latest',
        sync,
      }),
      'analyze',
      { reportId, context: 'profile analysis batch' }
    );

    console.log(`  Analyzed ${analyses.length} profiles`);
    await saveCheckpoint(reportId, 'analyze', { ...checkpointState, profileData, analyses });

    // ── Step 4: Aggregate report (Haiku + segment library RAG) ──────────
    console.log('\n[Orchestrator] Step 3/3: Aggregating report...');
    const report = await withClarificationRetry(
      () => runAggregateJob({
        reportId,
        tenantId,
        brand,
        brandName:     brand,
        profiles:      analyses,
        keepHandles,
        promptVersion: promptVersions.aggregation ?? 'latest',
      }),
      'aggregate',
      { reportId, context: 'report aggregation', analyses }
    );

    await clearCheckpoint(reportId);

    console.log(`\n[Orchestrator] Pipeline complete for report ${reportId}`);
    console.log(`  Segments:      ${report.audience_segments?.length ?? 0}`);
    console.log(`  Alignment:     ${report.alignment_score?.overall}/100`);
    console.log(`  Topics:        ${report.topics?.join(', ')}`);

    return report;

  } catch (err) {
    console.error(`\n[Orchestrator] Pipeline FAILED for report ${reportId}:`, err.message);

    await setReportStatus(reportId, 'failed', err.message);
    await auditJob(reportId, 'orchestrator', 'failed', { error: err.message });

    throw err;
  }
}

// ─── Clarification Agent ──────────────────────────────────────────────────────

/**
 * Wraps a job function with one clarification retry on ValidationError.
 *
 * On ValidationError (critical semantic issues):
 *   - Logs the issues
 *   - Re-runs the job with enriched context (issues injected into prompt)
 *   - If it fails again → propagates the error (hard failure)
 *
 * On any other error → propagates immediately (no retry).
 *
 * @param {Function} jobFn      - Async job function to run
 * @param {string}   jobName    - Name for logging
 * @param {object}   retryCtx   - Context passed to the clarification run
 */
async function withClarificationRetry(jobFn, jobName, retryCtx) {
  try {
    return await jobFn();
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;

    console.warn(`\n[ClarificationAgent] ${jobName} failed validation. Retrying with enriched context...`);
    console.warn(`  Issues: ${err.issues.map(i => i.issue).join('; ')}`);

    await auditJob(retryCtx.reportId, `${jobName}_clarification`, 'started', {
      issues: err.issues,
    });

    try {
      // Re-run with validation issues injected — the job functions accept
      // an optional `clarificationNotes` param that appends to the user prompt
      const result = await jobFn({
        ...retryCtx,
        clarificationNotes: buildClarificationNote(err.issues),
      });

      await auditJob(retryCtx.reportId, `${jobName}_clarification`, 'completed', {});
      return result;

    } catch (retryErr) {
      await auditJob(retryCtx.reportId, `${jobName}_clarification`, 'failed', {
        error: retryErr.message,
      });
      throw retryErr;
    }
  }
}

/**
 * Formats validation issues into a clarification instruction block
 * appended to the retry prompt.
 */
function buildClarificationNote(issues) {
  const lines = issues.map(i =>
    `• [${i.severity.toUpperCase()}] Field "${i.field}": ${i.issue}`
  );

  return `
━━━ УТОЧНЕННЯ (попередня спроба не пройшла валідацію) ━━━
Будь ласка, виправ наступні проблеми:
${lines.join('\n')}

Переконайся, що виправлення повністю вирішують кожну проблему
перед поверненням результату.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function setReportStatus(reportId, status, error = null) {
  await query(
    `UPDATE reports SET status = $1, error = $2 WHERE id = $3`,
    [status, error, reportId]
  );
}

// ─── Pipeline checkpoints ────────────────────────────────────────────────────

async function saveCheckpoint(reportId, lastStep, state) {
  await query(
    `INSERT INTO pipeline_checkpoints (report_id, last_step, state, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (report_id) DO UPDATE SET
       last_step  = EXCLUDED.last_step,
       state      = EXCLUDED.state,
       updated_at = NOW()`,
    [reportId, lastStep, JSON.stringify(state)]
  );
}

async function loadCheckpoint(reportId) {
  const { rows } = await query(
    `SELECT last_step, state FROM pipeline_checkpoints WHERE report_id = $1`,
    [reportId]
  );
  return rows.length > 0 ? { lastStep: rows[0].last_step, state: rows[0].state } : null;
}

async function clearCheckpoint(reportId) {
  await query(`DELETE FROM pipeline_checkpoints WHERE report_id = $1`, [reportId]);
}

// ─── Resume pipeline ─────────────────────────────────────────────────────────

/**
 * Resumes a failed pipeline from its last successful checkpoint.
 *
 * @param {object}   params
 * @param {string}   params.reportId        - UUID of the failed report
 * @param {string}   params.tenantId        - Tenant UUID
 * @param {object}   params.promptVersions  - Pinned prompt versions (optional)
 */
export async function resumePipeline({ reportId, tenantId, promptVersions = {} }) {
  // Verify report is in failed state
  const { rows } = await query(
    `SELECT status, brand, brand_raw_input, handles, brand_dna, report_json
     FROM reports WHERE id = $1 AND tenant_id = $2`,
    [reportId, tenantId]
  );

  if (rows.length === 0) throw new Error('Report not found');
  if (rows[0].status !== 'failed') {
    throw new Error(`Cannot resume report with status "${rows[0].status}" — only "failed" reports can be resumed`);
  }

  const checkpoint = await loadCheckpoint(reportId);
  if (!checkpoint) {
    throw new Error('No checkpoint found — the pipeline must be re-run from scratch');
  }

  const report = rows[0];
  const { lastStep, state } = checkpoint;
  const stepIdx = STEP_ORDER.indexOf(lastStep);

  console.log(`\n[Orchestrator] Resuming pipeline for report ${reportId} from after "${lastStep}"`);
  await auditJob(reportId, 'orchestrator_resume', 'started', { resumeFrom: lastStep });

  try {
    await setReportStatus(reportId, 'running');

    const brand            = state.brand ?? report.brand ?? '';
    const keepHandles      = state.keepHandles ?? false;
    let profileData        = state.profileData;
    let analyses           = state.analyses;
    let aggregatedReport;

    // Resume from the step AFTER the last completed one
    if (stepIdx < STEP_ORDER.indexOf('fetch')) {
      console.log('\n[Orchestrator] Resuming: Fetching profiles...');
      profileData = await fetchProfiles(state.validatedHandles, reportId);
      await saveCheckpoint(reportId, 'fetch', { ...state, profileData });
    }

    if (stepIdx < STEP_ORDER.indexOf('analyze')) {
      console.log('\n[Orchestrator] Resuming: Analyzing profiles...');
      analyses = await withClarificationRetry(
        () => runAnalyzeJob({
          reportId,
          tenantId,
          profiles:      profileData,
          promptVersion: promptVersions.analysis ?? 'latest',
        }),
        'analyze',
        { reportId, context: 'profile analysis batch (resumed)' }
      );
      await saveCheckpoint(reportId, 'analyze', { ...state, profileData, analyses });
    }

    if (stepIdx < STEP_ORDER.indexOf('aggregate')) {
      console.log('\n[Orchestrator] Resuming: Aggregating report...');
      aggregatedReport = await withClarificationRetry(
        () => runAggregateJob({
          reportId,
          tenantId,
          brand,
          brandName:     brand,
          profiles:      analyses,
          keepHandles,
          promptVersion: promptVersions.aggregation ?? 'latest',
        }),
        'aggregate',
        { reportId, context: 'report aggregation (resumed)', analyses }
      );
    }

    await clearCheckpoint(reportId);
    await auditJob(reportId, 'orchestrator_resume', 'completed', { resumedFrom: lastStep });

    console.log(`\n[Orchestrator] Resumed pipeline complete for report ${reportId}`);
    return aggregatedReport;

  } catch (err) {
    console.error(`\n[Orchestrator] Resumed pipeline FAILED for report ${reportId}:`, err.message);
    await setReportStatus(reportId, 'failed', err.message);
    await auditJob(reportId, 'orchestrator_resume', 'failed', { error: err.message });
    throw err;
  }
}