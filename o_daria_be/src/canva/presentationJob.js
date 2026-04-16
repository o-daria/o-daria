/**
 * presentationJob.js — Canva Presentation Orchestrator
 *
 * Runs the two automated steps of the Canva flow:
 *   1. Upload profile images to Canva (assetUploader)
 *   2. Build the fully-resolved query + manifest (queryBuilder)
 *
 * After completion (status=ready), the user triggers MCP generation
 * manually via Claude Code, then posts back the result via the approve endpoint.
 */

import path from 'path';
import { query } from '../db/client.js';
import { uploadProfileAssets } from './assetUploader.js';
import { buildQuery, QUERY_LENGTH_LIMIT } from './queryBuilder.js';

const PROFILES_DIR = path.resolve(process.cwd(), 'profiles');

// ─── Status updater ──────────────────��───────────────────────────────────────

async function updateStatus(presentationId, status, fields = {}) {
  const setClauses = ['status = $2', 'updated_at = NOW()'];
  const values = [presentationId, status];
  let paramIdx = 3;

  for (const [col, val] of Object.entries(fields)) {
    setClauses.push(`${col} = $${paramIdx}`);
    values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    paramIdx++;
  }

  await query(
    `UPDATE presentation_requests SET ${setClauses.join(', ')} WHERE id = $1`,
    values
  );
}

// ─── Main entry ─────────────────────────────────��────────────────────────────

/**
 * Run the presentation preparation pipeline.
 *
 * @param {object} params
 * @param {string} params.presentationId - presentation_requests.id
 * @param {string} params.reportId
 * @param {string} params.tenantId
 * @param {object} params.report         - The audience report JSON (handles may be hashed)
 * @param {object} [params.handleMap]    - { hash → plaintext } map built at analysis time
 */
export async function runPresentationJob({ presentationId, reportId, tenantId, report, handleMap = {} }, canvaToken) {
  try {
    // ── Step 1: Upload assets ──────────────────────────────────────────────
    await updateStatus(presentationId, 'uploading_assets');

    // report_json stores handles as sha256 hashes when keepHandles=false.
    // Resolve them back to plaintext using the handle map so assetUploader
    // can find the correct profiles/{handle}/ directory.
    const hashedHandles = collectHandles(report);
    const handles = hashedHandles.map(h => handleMap[h] ?? h);
    console.log(`[PresentationJob] Uploading assets for ${handles.length} handles`);

    const assetMap = await uploadProfileAssets(handles, {
      profilesDir: PROFILES_DIR,
    }, canvaToken);

    await updateStatus(presentationId, 'building_query', {
      asset_map: assetMap,
    });

    // ── Step 2: Build query ────────────────────────────────────────────────
    const brandName   = report.brand || '';
    const brandValues = report.brand_DNA || '';

    // report_json stores handles as sha256 hashes; assetMap is keyed by plaintext.
    // De-hash in-memory so buildQuery can match handles against assetMap keys.
    const dehashed = deHashReport(report, handleMap);

    let result = buildQuery(dehashed, assetMap, { brandName, brandValues });

    if (result.query.length > QUERY_LENGTH_LIMIT) {
      console.log(`[PresentationJob] Query too long (${result.query.length}), applying compact mode`);
      result = buildQuery(dehashed, assetMap, { brandName, brandValues, compact: true });
    }

    const manifest = {
      asset_ids:    result.allAssetIds,
      total_slides: result.totalSlides,
    };

    await updateStatus(presentationId, 'ready', {
      query_text: result.query,
      manifest,
    });

    console.log(`[PresentationJob] Ready — ${result.allAssetIds.length} assets, ${result.totalSlides} slides`);
  } catch (err) {
    console.error(`[PresentationJob] Failed for ${presentationId}:`, err.message);
    await updateStatus(presentationId, 'failed', { error: err.message }).catch(() => {});
    throw err;
  }
}

// ─── Helpers ────────────────���────────────────────────────────────────────────

/**
 * Replace hashed handles in the report with their plaintext equivalents.
 * Used only in-memory for query building — the de-hashed copy is never persisted.
 */
function deHashReport(report, handleMap) {
  return {
    ...report,
    best_photos_for_persona_slide: (report.best_photos_for_persona_slide ?? [])
      .map(h => handleMap[h] ?? h),
    audience_segments: (report.audience_segments ?? []).map(seg => ({
      ...seg,
      representative_handles: (seg.representative_handles ?? [])
        .map(h => handleMap[h] ?? h),
    })),
  };
}

/**
 * Collect all unique handles referenced in the report that need images.
 */
function collectHandles(report) {
  const handleSet = new Set();

  for (const handle of (report.best_photos_for_persona_slide ?? [])) {
    handleSet.add(handle);
  }

  for (const segment of (report.audience_segments ?? [])) {
    for (const handle of (segment.representative_handles ?? [])) {
      handleSet.add(handle);
    }
  }

  return [...handleSet];
}
