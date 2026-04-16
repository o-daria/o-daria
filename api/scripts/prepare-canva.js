/**
 * prepare-canva.js — Canva Presentation Query Preprocessor (CLI wrapper)
 *
 * Reads audience_report.json + asset_map.json, builds the fully-resolved
 * Canva query deterministically, and writes two files for Claude Code to consume:
 *
 *   query_debug.txt          — fully resolved query, zero {{ }} placeholders
 *   presentation_manifest.json — { asset_ids: [...], total_slides: N }
 *
 * Claude Code reads these files and calls mcp__Canva__generate-design
 * byte-for-byte — no template construction happens inside the session.
 *
 * Usage:
 *   node scripts/prepare-canva.js
 *   node scripts/prepare-canva.js --compact   (force compact mode)
 *
 * Inputs (read from project root):
 *   audience_report.json
 *   asset_map.json
 *
 * Env vars (optional overrides):
 *   BRAND_NAME, BRAND_VALUES
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildQuery,
  resolveHandle,
  QUERY_LENGTH_LIMIT,
} from '../src/canva/queryBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const forceCompact = process.argv.includes('--compact');

// ─── Read inputs ──────────────────────────────────────────────────────────────

function readJson(filename) {
  const p = path.join(ROOT, filename);
  if (!fs.existsSync(p)) {
    throw new Error(`${filename} not found at ${p}. Run the pipeline first.`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const report   = readJson('audience_report.json');
  const assetMap = readJson('asset_map.json');

  const options = {
    brandName:   process.env.BRAND_NAME   || undefined,
    brandValues: process.env.BRAND_VALUES || undefined,
    compact:     false,
  };

  // First pass — try full query
  let result = buildQuery(report, assetMap, options);

  let compactApplied = false;
  if (forceCompact || result.query.length > QUERY_LENGTH_LIMIT) {
    if (!forceCompact) {
      process.stderr.write(`[compact mode applied] Query was ${result.query.length} chars (limit ${QUERY_LENGTH_LIMIT}). Re-building in compact mode.\n`);
    }
    result = buildQuery(report, assetMap, { ...options, compact: true });
    compactApplied = true;
  }

  const { query, allAssetIds, totalSlides, personaPhotoIds, segmentPhotoIds } = result;

  // Write outputs
  fs.writeFileSync(path.join(ROOT, 'query_debug.txt'), query, 'utf-8');
  fs.writeFileSync(
    path.join(ROOT, 'presentation_manifest.json'),
    JSON.stringify({ asset_ids: allAssetIds, total_slides: totalSlides }, null, 2),
    'utf-8'
  );

  // Summary
  const segments    = report.audience_segments ?? [];
  const missingHandles = [];
  for (const handle of (report.best_photos_for_persona_slide ?? [])) {
    if (!resolveHandle(handle, assetMap)) missingHandles.push(handle);
  }
  for (const seg of segments) {
    for (const handle of (seg.representative_handles ?? [])) {
      if (!resolveHandle(handle, assetMap)) missingHandles.push(handle);
    }
  }

  console.log(`\n✓ query_debug.txt written (${query.length} chars${compactApplied ? ', compact mode' : ''})`);
  console.log(`✓ presentation_manifest.json written`);
  console.log(`  Total slides:  ${totalSlides}`);
  console.log(`  Total assets:  ${allAssetIds.length}`);
  console.log(`  Persona photos: ${personaPhotoIds.length}/8`);
  segments.forEach(seg => {
    const count = (segmentPhotoIds[seg.segment_name] ?? []).length;
    console.log(`  Segment "${seg.segment_name}": ${count}/3 photos`);
  });
  if (missingHandles.length > 0) {
    console.log(`\n  MISSING assets for: ${[...new Set(missingHandles)].join(', ')}`);
    console.log('  Run node upload_assets.js to upload missing images, then re-run this script.');
  }
  console.log('\nNext step: ask Claude Code to read query_debug.txt and presentation_manifest.json, then call generate-design.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
