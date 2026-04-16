/**
 * run-local.js — Local Pipeline Runner
 *
 * Runs analysis + aggregation on pre-scraped profiles in profiles/{handle}/
 * without PostgreSQL, pgvector, or Apify.
 *
 * Replaces the deleted analyzer.js + aggregator.js scripts,
 * using the new prompt templates from src/prompts/templates/.
 *
 * Usage:
 *   node scripts/run-local.js --handles handle1,handle2,handle3
 *   node scripts/run-local.js --all                     (all handles in profiles/)
 *   node scripts/run-local.js --handles h1,h2 --force   (re-analyze even if cached)
 *
 * Brand input (pick one):
 *   --brand "Brand name and description"   (compiled to brand DNA)
 *   BRAND_NAME + BRAND_VALUES env vars     (used as-is without Haiku compilation)
 *
 * Outputs:
 *   profiles/{handle}/analysis.json    — per-profile result (cached, skip if exists)
 *   audience_report.json               — final aggregated report
 *
 * Bypasses: PostgreSQL, pgvector RAG, Apify, report signing, audit trail
 * Reuses:   prompt templates, sanitizeCaption(), Anthropic API
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

// Import prompt templates directly (bypassing DB-backed registry)
import { ANALYSIS_SYSTEM_PROMPT_V2, buildAnalysisUserContent } from '../src/prompts/templates/analysis.js';
import { AGGREGATION_SYSTEM_PROMPT_V2, buildAggregationUserPrompt, AGGREGATION_OUTPUT_SCHEMA } from '../src/prompts/templates/aggregation.js';
import { BRAND_DNA_COMPILER_PROMPT } from '../src/prompts/templates/brandDna.js';
import { formatBrandDnaForPrompt }   from '../src/rag/brandDnaCompiler.js';
import { sanitizeBrandInput }        from '../src/safety/inputSanitizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const PROFILES  = path.join(ROOT, 'profiles');

const client = new Anthropic();

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args  = process.argv.slice(2);
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--handles' && args[i + 1]) {
      flags.handles = args[i + 1].split(',').map(h => h.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--brand' && args[i + 1]) {
      flags.brand = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      flags.all = true;
    } else if (args[i] === '--force') {
      flags.force = true;
    }
  }

  return flags;
}

// ─── Profile discovery ────────────────────────────────────────────────────────

function discoverHandles() {
  if (!fs.existsSync(PROFILES)) {
    throw new Error(`profiles/ directory not found at ${PROFILES}`);
  }
  return fs.readdirSync(PROFILES)
    .filter(name => fs.statSync(path.join(PROFILES, name)).isDirectory());
}

// ─── Image loading ────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function findImageFile(dir, basename) {
  for (const ext of IMAGE_EXTS) {
    const p = path.join(dir, basename + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function imageToBase64(filepath) {
  return fs.readFileSync(filepath).toString('base64');
}

function mimeType(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : 'image/png';
}

/**
 * Load profile images and captions from profiles/{handle}/
 *
 * Expected file layout (all optional, use whatever is present):
 *   profiles/{handle}/grid.jpg     — grid screenshot
 *   profiles/{handle}/post_1.jpg   — post image 1
 *   profiles/{handle}/post_2.jpg   — post image 2
 *   profiles/{handle}/post_3.jpg   — post image 3
 *   profiles/{handle}/captions.json — array of caption strings
 *
 * Returns { handle, imagePaths, captions }
 * imagePaths format matches buildAnalysisUserContent expectations:
 *   { gridData: base64string|null, gridMime, posts: [{data, mime}] }
 */
function loadProfile(handle) {
  const dir = path.join(PROFILES, handle);
  if (!fs.existsSync(dir)) return null;

  const gridFile = findImageFile(dir, 'grid');
  const gridData = gridFile ? imageToBase64(gridFile) : null;
  const gridMime = gridFile ? mimeType(gridFile) : 'image/jpeg';

  const posts = [];
  for (const suffix of ['post_1', 'post_2', 'post_3']) {
    const f = findImageFile(dir, suffix);
    if (f) posts.push({ data: imageToBase64(f), mime: mimeType(f) });
  }

  let captions = [];
  const captionsJson = path.join(dir, 'captions.json');
  const captionsTxt  = path.join(dir, 'captions.txt');
  if (fs.existsSync(captionsJson)) {
    const raw = JSON.parse(fs.readFileSync(captionsJson, 'utf-8'));
    captions = Array.isArray(raw) ? raw : (raw.captions ?? []);
  } else if (fs.existsSync(captionsTxt)) {
    captions = fs.readFileSync(captionsTxt, 'utf-8')
      .split('\n---\n')
      .map(s => s.trim())
      .filter(Boolean);
  }

  return { handle, imagePaths: { gridData, gridMime, posts }, captions };
}

// ─── Brand DNA compilation ────────────────────────────────────────────────────

/**
 * Compile brand DNA from free text using BRAND_DNA_COMPILER_PROMPT directly.
 * Bypasses DB-backed registry (compileBrandDna imports getPrompt which needs Postgres).
 */
async function compileBrandDnaLocal(rawInput) {
  const sanitized = sanitizeBrandInput(rawInput);

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system:     BRAND_DNA_COMPILER_PROMPT,
    messages:   [{ role: 'user', content: `Brand description: "${sanitized}"\n\nReturn structured JSON.` }],
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }
}

// ─── Single-profile analysis ──────────────────────────────────────────────────

/**
 * Analyze one profile using ANALYSIS_SYSTEM_PROMPT_V2 directly.
 * No Batch API, no pgvector — straightforward individual call.
 */
async function analyzeProfile(profile, brandValuesString) {
  const userContent = buildAnalysisUserContent(
    profile.handle,
    profile.captions,
    profile.imagePaths,
    brandValuesString,
    []   // no RAG calibration in local mode
  );

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
    system:     ANALYSIS_SYSTEM_PROMPT_V2,
    messages:   [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0].text.trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }

  // Enforce handle from our own source (don't trust model output)
  parsed.handle = profile.handle;
  return parsed;
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

async function aggregateReport(analyses, brandName, brandValuesString) {
  const userPrompt = buildAggregationUserPrompt(
    analyses,
    brandName,
    brandValuesString,
    [],   // no historical segment calibration in local mode
    AGGREGATION_OUTPUT_SCHEMA
  );

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 4500,
    system:     AGGREGATION_SYSTEM_PROMPT_V2,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs();

  // ── Resolve handles ────────────────────────────────────────────────────────
  let handles;
  if (flags.all) {
    handles = discoverHandles();
    console.log(`Found ${handles.length} handle(s) in profiles/`);
  } else if (flags.handles?.length > 0) {
    handles = flags.handles;
  } else {
    console.error('Usage: node scripts/run-local.js --handles h1,h2,h3 [--brand "..."] [--force]');
    console.error('       node scripts/run-local.js --all [--brand "..."] [--force]');
    process.exit(1);
  }

  // ── Brand input ────────────────────────────────────────────────────────────
  const brandRaw = flags.brand ?? process.env.BRAND_NAME
    ? `${process.env.BRAND_NAME}. ${process.env.BRAND_VALUES ?? ''}`.trim()
    : null;

  if (!brandRaw) {
    console.error('Provide brand input via --brand "..." or BRAND_NAME env var.');
    process.exit(1);
  }

  // ── Compile brand DNA ──────────────────────────────────────────────────────
  console.log('\n[1/3] Compiling brand DNA...');
  const brandDna = await compileBrandDnaLocal(brandRaw);
  const brandName = brandDna.key_differentiator ?? process.env.BRAND_NAME ?? brandRaw.slice(0, 40);
  const brandValuesString = formatBrandDnaForPrompt(brandDna);
  console.log(`  Brand: ${brandName}`);

  // ── Load + analyze profiles ────────────────────────────────────────────────
  console.log(`\n[2/3] Analyzing ${handles.length} profile(s)...`);
  const analyses = [];

  for (const handle of handles) {
    const cacheFile = path.join(PROFILES, handle, 'analysis.json');

    if (!flags.force && fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      console.log(`  ↩ @${handle} (cached)`);
      analyses.push(cached);
      continue;
    }

    const profile = loadProfile(handle);
    if (!profile) {
      console.warn(`  ✗ @${handle} — directory not found in profiles/, skipping`);
      continue;
    }

    const hasImages = profile.imagePaths.gridData || profile.imagePaths.posts.length > 0;
    if (!hasImages) {
      console.warn(`  ✗ @${handle} — no images found in profiles/${handle}/, skipping`);
      continue;
    }

    try {
      console.log(`  … @${handle}`);
      const analysis = await analyzeProfile(profile, brandValuesString);
      fs.writeFileSync(cacheFile, JSON.stringify(analysis, null, 2));
      console.log(`  ✓ @${handle}`);
      analyses.push(analysis);
    } catch (err) {
      console.error(`  ✗ @${handle} — ${err.message}`);
    }
  }

  if (analyses.length === 0) {
    console.error('\nNo profiles analyzed. Check that profiles/ directories contain images.');
    process.exit(1);
  }

  // ── Aggregate ──────────────────────────────────────────────────────────────
  console.log(`\n[3/3] Aggregating report from ${analyses.length} profile(s)...`);
  const report = await aggregateReport(analyses, brandName, brandValuesString);

  // Write output
  const outPath = path.join(ROOT, 'audience_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`\n✓ audience_report.json written`);
  console.log(`  Segments:  ${report.audience_segments?.length ?? 0}`);
  console.log(`  Topics:    ${(report.topics ?? []).join(', ')}`);
  console.log(`  Alignment: ${report.alignment_score?.overall ?? 'n/a'}/100`);
  console.log('\nNext step: run node scripts/prepare-canva.js (after uploading assets).');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
