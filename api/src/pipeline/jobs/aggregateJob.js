/**
 * aggregateJob.js — Pipeline Job 3
 *
 * Synthesizes per-profile analyses into the final audience report.
 * Wraps the original aggregator.js logic with:
 *   - Segment library RAG (cross-client historical calibration, tenant-isolated)
 *   - Structured brand DNA injection (not raw text)
 *   - Semantic validation gate post-generation
 *   - Output signing
 *   - Segment library indexing (contributes to future reports)
 *
 * This is the only job that touches the segment_library table.
 */

// import 'dotenv/config'
import Anthropic                   from '@anthropic-ai/sdk';
import { findSimilarSegments, indexReportSegments } from '../../rag/segmentLibrary.js';
import { getPrompt, snapshotVersions }              from '../../prompts/registry.js';
import { buildAggregationUserPrompt, AGGREGATION_OUTPUT_SCHEMA } from '../../prompts/templates/aggregation.js';
import { runValidation }                            from './validateJob.js';
import { signReport }                               from '../../safety/outputSigner.js';
import { sanitizeReportForStorage, hashHandle }     from '../../safety/piiHandler.js';
import { auditJob }                                 from './auditTrail.js';
import { query }                                    from '../../db/client.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL      = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 8000;

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * @param {object}   params
 * @param {string}   params.reportId       - UUID of the parent report
 * @param {string}   params.tenantId       - UUID of the requesting tenant
 * @param {string}   params.brandName      - Brand name string
 * @param {object}   params.brandDna       - Compiled brand DNA object
 * @param {object[]} params.profiles       - Array of profile analyses from analyzeJob
 * @param {boolean}  params.keepHandles    - Tenant opted into storing plaintext handles
 * @param {string}   params.promptVersion  - 'latest' or pinned version
 * @returns {Promise<object>}              - Signed, validated audience report
 */
export async function runAggregateJob({
  reportId,
  tenantId,
  brand,
  brandName,
  brandDna,
  profiles,
  keepHandles = false,
  promptVersion = 'latest',
}) {
  await auditJob(reportId, 'aggregate', 'started', { profileCount: profiles.length });

  const { content: systemPrompt, version: resolvedVersion } =
    await getPrompt('aggregation', promptVersion);


  // ── 1. RAG: retrieve historical segment calibration (cross-client, tenant-isolated) ──
  console.log('[Aggregate] Retrieving historical segment calibration...');
  const historicalSegments = await findSimilarSegments(profiles, tenantId, { k: 5 });
  console.log(`  Found ${historicalSegments.length} similar historical segment(s)`);

  // ── 2. Build prompt ──────────────────────────────────────────────────────
  const userPrompt = buildAggregationUserPrompt(
    profiles,
    brandName,
    historicalSegments,
    AGGREGATION_OUTPUT_SCHEMA
  );

  // ── 3. Call Claude ───────────────────────────────────────────────────────
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].text.trim();
  let report;

  try {
    report = JSON.parse(raw);
  } catch {
    report = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }

  // ── 4. Semantic validation gate ──────────────────────────────────────────
  // Throws ValidationError on critical issues → orchestrator handles retry
  console.log('[Aggregate] Running semantic validation...');
  await runValidation(report, 'report', { brandDna });

  // ── 5. Sign the report ────────────────────────────────────────────────────
  const promptVersions = await snapshotVersions(['analysis', 'aggregation', 'validation']);

  const signed = signReport(report, {
    modelVersions:  { analysis: 'claude-sonnet-4-6', aggregation: MODEL },
    promptVersions,
    handleCount:    profiles.length,
  });

  // ── 6. Sanitize for storage (PII handling) ────────────────────────────────
  const storable = sanitizeReportForStorage(signed, { keepHandles });

  // ── 7. Build handle map for presentation asset lookup ────────────────────
  // report_json is pseudonymized (handles replaced by hashes), but Canva
  // asset upload needs the real handle to find profiles/{handle}/ on disk.
  // We store { sha256_hash: plaintext_handle } separately, scoped to this
  // tenant's report row — never shared across tenants.
  const handleMap = {};
  for (const profile of profiles) {
    const handle = profile.handle;
    if (handle && handle !== 'unknown') {
      handleMap[hashHandle(handle)] = handle;
    }
  }

  // ── 8. Persist to DB ──────────────────────────────────────────────────────
  await query(
    `UPDATE reports
     SET report_json   = $1,
         integrity     = $2,
         handle_map    = $3,
         status        = 'done',
         completed_at  = now()
     WHERE id = $4`,
    [JSON.stringify(storable), JSON.stringify(storable.integrity), JSON.stringify(handleMap), reportId]
  );

  // ── 8. Index segments into shared library (cross-client learning) ─────────
  if (report.audience_segments?.length > 0) {
    console.log(`[Aggregate] Indexing ${report.audience_segments.length} segment(s) into library...`);
    await indexReportSegments(report.audience_segments, tenantId, brand).catch(err => {
      // Non-fatal: indexing failure doesn't fail the report
      console.error('[Aggregate] Segment indexing failed (non-fatal):', err.message);
    });
  }

  await auditJob(reportId, 'aggregate', 'completed', {
    segmentCount:          report.audience_segments?.length ?? 0,
    alignmentScore:        report.alignment_score?.overall,
    historicalCalibration: historicalSegments.length,
    promptVersion:         resolvedVersion,
  });

  return signed;
}
