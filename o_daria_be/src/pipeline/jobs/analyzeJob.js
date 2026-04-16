/**
 * analyzeJob.js — Pipeline Job 2
 *
 * Analyzes Instagram profiles using Claude Batch API.
 * Wraps the original analyzer.js logic with:
 *   - Cache check (skip re-analysis if within TTL)
 *   - RAG retrieval (similar profiles → few-shot calibration)
 *   - Sanitized caption injection (injection defense)
 *   - Batch API for cost efficiency (50% vs sync)
 *   - Per-profile job audit trail
 *
 * Flow per profile:
 *   1. Check profileCache → return cached if hit
 *   2. Find k=2 similar cached profiles for calibration
 *   3. Build user content with sanitized captions + calibration block
 *   4. Submit to Batch API (all cache-miss profiles in one batch)
 *   5. Poll until complete
 *   6. Validate + store each result in cache
 *   7. Return combined array (cache hits + fresh analyses)
 */

// import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { getCachedAnalysis, setCachedAnalysis, findSimilarProfiles } from '../../rag/profileCache.js';
import { buildAnalysisUserContent, buildUploadAnalysisUserContent } from '../../prompts/templates/analysis.js';
import { getPrompt }                from '../../prompts/registry.js';
import { auditJob }                 from './auditTrail.js';

const PROFILES_DIR = path.resolve(process.cwd(), 'profiles');

const client           = new Anthropic({
  apiKey:  process.env.ANTHROPIC_API_KEY,
  timeout: 120_000,   // 120 s — sync calls can be slow for long prompts
});
const POLL_INTERVAL_MS  = 10_000;
const MODEL             = 'claude-sonnet-4-6';
const MAX_TOKENS        = 2000;
const BATCH_SIZE_LIMIT  = 240 * 1024 * 1024;  // 240 MB — conservative headroom under the 256 MB API limit

/** Compute a lightweight hash of scraped profile data for cache staleness detection. */
function computeProfileHash(profile) {
  const payload = JSON.stringify({
    captions:   profile.captions ?? [],
    imagePaths: profile.imagePaths ?? [],
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/** Look up the profile hash, falling back to a hash of the handle itself if not found. */
function resolveProfileHash(hashByHandle, handle) {
  return hashByHandle[handle]
    ?? crypto.createHash('sha256').update(handle).digest('hex').slice(0, 16);
}

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * @param {object}    params
 * @param {string}    params.reportId      - UUID of the parent report (for audit)
 * @param {string}    params.tenantId      - UUID of the requesting tenant
 * @param {object[]}  [params.profiles]    - [{ handle, captions, imagePaths }] — Apify/local mode
 * @param {object[]}  [params.uploadedFiles] - [{ buffer, mimetype, originalname }] — upload mode
 * @param {object}    params.brandDna      - Compiled brand DNA object
 * @param {string}    params.promptVersion - Pinned version e.g. 'v2.0' or 'latest'
 * @returns {Promise<object[]>}             - Array of analysis objects
 */
export async function runAnalyzeJob({ reportId, tenantId, profiles, uploadedFiles, promptVersion = 'latest', sync = false }) {
  const isUploadMode = Array.isArray(uploadedFiles) && uploadedFiles.length > 0;
  await auditJob(reportId, 'analyze', 'started', { profileCount: isUploadMode ? uploadedFiles.length : profiles.length });

  const { content: systemPrompt, version: resolvedVersion } = await getPrompt('analysis', promptVersion);

  // ── Upload mode: identify handle + analyze in a single Vision pass ─────
  if (isUploadMode) {
    const uploadRequests = buildUploadBatchRequests(uploadedFiles, systemPrompt);
    const analyses = sync
      ? await runSyncRequests(uploadRequests, resolvedVersion, {})
      : await runBatchRequests(uploadRequests, resolvedVersion, {});

    await auditJob(reportId, 'analyze', 'completed', {
      cacheHits: 0, fresh: analyses.length, promptVersion: resolvedVersion,
    });
    return analyses;
  }

  // ── 1. Cache check ──────────────────────────────────────────────────────
  const cacheHits   = [];
  const cacheMisses = [];

  for (const profile of profiles) {
    const cached = await getCachedAnalysis(profile.handle);
    if (cached) {
      console.log(`  [Cache HIT]  @${profile.handle}`);
      cacheHits.push(cached.analysis);
    } else {
      console.log(`  [Cache MISS] @${profile.handle}`);
      cacheMisses.push(profile);
    }
  }

  console.log(`\nAnalyze: ${cacheHits.length} cache hits, ${cacheMisses.length} to analyze`);

  if (cacheMisses.length === 0) {
    await auditJob(reportId, 'analyze', 'completed', { cacheHits: cacheHits.length, fresh: 0, promptVersion: resolvedVersion });
    return cacheHits;
  }

  // ── 2. RAG retrieval + request construction ────────────────────────────
  const profileRequests = await buildBatchRequests(
    cacheMisses, systemPrompt
  );

  // ── 3. Run analysis ────────────────────────────────────────────────────
  const hashByHandle = Object.fromEntries(
    cacheMisses.map(p => [p.handle, computeProfileHash(p)])
  );

  const freshAnalyses = sync
    ? await runSyncRequests(profileRequests, resolvedVersion, hashByHandle)
    : await runBatchRequests(profileRequests, resolvedVersion, hashByHandle);

  const all = [...cacheHits, ...freshAnalyses];

  await auditJob(reportId, 'analyze', 'completed', {
    cacheHits:     cacheHits.length,
    fresh:         freshAnalyses.length,
    promptVersion: resolvedVersion,
  });

  return all;
}

// ─── Batch request construction ───────────────────────────────────────────────

async function buildBatchRequests(profiles, systemPrompt) {
  const requests = [];

  for (const profile of profiles) {
    // Retrieve k=2 similar cached profiles for few-shot calibration
    // Use a lightweight sketch from the grid image label if full analysis unavailable
    const similarProfiles = await findSimilarProfiles(
      { topics: [], lifestyle_cluster: '', observed_signals: {} },
      { k: 2, excludeHandle: profile.handle }
    );

    const userContent = buildAnalysisUserContent(
      profile.handle,
      profile.captions ?? [],
      profile.imagePaths,
      similarProfiles
    );

    requests.push({
      custom_id: profile.handle,
      params: {
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type:          'text',
            text:          systemPrompt,
            cache_control: { type: 'ephemeral' },  // shared cache across all requests → cost savings
          },
        ],
        messages: [{ role: 'user', content: userContent }],
      },
    });
  }

  return requests;
}

/**
 * Builds one batch request per uploaded image file.
 * The model identifies the Instagram handle from the image and produces the
 * full analysis JSON in a single pass — no separate handle-identification call.
 * custom_id uses the original filename as a stable key; the parsed handle from
 * the model response overwrites it in parseAnalysisResponse.
 */
function buildUploadBatchRequests(uploadedFiles, systemPrompt) {
  return uploadedFiles.map((file, i) => {
    const mediaType = toAnthropicMediaType(file.mimetype);
    const base64    = file.buffer.toString('base64');

    const userContent = buildUploadAnalysisUserContent(base64, mediaType);

    return {
      custom_id: `upload_${i}_${file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 58)}`,
      // base64 size ≈ raw * 4/3; add 4 KB envelope overhead per request
      _byteSize: Math.ceil(file.buffer.length * 4 / 3) + 4096,
      _buffer:   file.buffer,
      _mimetype: file.mimetype,
      params: {
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type:          'text',
            text:          systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userContent }],
      },
    };
  });
}

function toAnthropicMediaType(mimetype) {
  const map = {
    'image/jpeg': 'image/jpeg',
    'image/jpg':  'image/jpeg',
    'image/png':  'image/png',
    'image/gif':  'image/gif',
    'image/webp': 'image/webp',
  };
  return map[mimetype] ?? 'image/jpeg';
}

// ─── Sync execution (plain API calls) ────────────────────────────────────────

async function runSyncRequests(requests, resolvedVersion, hashByHandle) {
  const analyses = [];
  const handleImageCount = new Map();

  for (const req of requests) {
    const fallbackHandle = req.custom_id;
    console.log(`  Analyzing @${fallbackHandle}...`);

    const response = await client.messages.create(req.params);
    const parsed = parseAnalysisResponse(response.content[0].text.trim(), fallbackHandle);
    const handle = parsed.handle;

    // Persist uploaded image to disk so assetUploader can find it later
    if (req._buffer) {
      const idx = (handleImageCount.get(handle) ?? 0) + 1;
      handleImageCount.set(handle, idx);
      saveUploadedImage(handle, idx, req._buffer, req._mimetype);
    }

    await setCachedAnalysis(handle, parsed, resolveProfileHash(hashByHandle, handle), resolvedVersion, MODEL);
    analyses.push(parsed);
    console.log(`  ✓ @${handle}`);
  }

  return analyses;
}

// ─── Batch execution ─────────────────────────────────────────────────────────

async function runBatchRequests(requests, resolvedVersion, hashByHandle) {
  const analyses = [];
  const chunks   = chunkBySizeLimit(requests, BATCH_SIZE_LIMIT);

  // Build a lookup from custom_id → { _buffer, _mimetype } for image persistence
  const bufferByCustomId = new Map(
    requests
      .filter(r => r._buffer)
      .map(r => [r.custom_id, { buffer: r._buffer, mimetype: r._mimetype }])
  );
  const handleImageCount = new Map();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`\nSubmitting batch ${i + 1}/${chunks.length} (${chunk.length} requests)...`);

    // Strip internal hints before sending to the API
    const apiRequests = chunk.map(({ _byteSize: _, _buffer: __, _mimetype: ___, ...req }) => req);
    const batch = await client.messages.batches.create({ requests: apiRequests });
    await pollBatch(batch.id);

    for await (const result of await client.messages.batches.results(batch.id)) {
      const fallbackHandle = result.custom_id;

      if (result.result.type !== 'succeeded') {
        console.error(`  ✗ @${fallbackHandle} — ${result.result.type}: ${result.result.error?.message ?? ''}`);
        continue;
      }

      const parsed = parseAnalysisResponse(result.result.message.content[0].text.trim(), fallbackHandle);
      const handle = parsed.handle;

      // Persist uploaded image to disk so assetUploader can find it later
      const fileInfo = bufferByCustomId.get(fallbackHandle);
      if (fileInfo) {
        const idx = (handleImageCount.get(handle) ?? 0) + 1;
        handleImageCount.set(handle, idx);
        saveUploadedImage(handle, idx, fileInfo.buffer, fileInfo.mimetype);
      }

      await setCachedAnalysis(handle, parsed, resolveProfileHash(hashByHandle, handle), resolvedVersion, MODEL);
      analyses.push(parsed);
      console.log(`  ✓ @${handle}`);
    }
  }

  return analyses;
}

/** Splits requests into chunks where each chunk's total _byteSize stays under limit. */
function chunkBySizeLimit(requests, limit) {
  const chunks = [];
  let current  = [];
  let size     = 0;

  for (const req of requests) {
    const reqSize = req._byteSize ?? 0;
    if (current.length > 0 && size + reqSize > limit) {
      chunks.push(current);
      current = [];
      size    = 0;
    }
    current.push(req);
    size += reqSize;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ─── Batch polling ────────────────────────────────────────────────────────────

async function pollBatch(batchId) {
  process.stdout.write(`Waiting for batch ${batchId}`);

  while (true) {
    await sleep(POLL_INTERVAL_MS);
    const batch  = await client.messages.batches.retrieve(batchId);
    const counts = batch.request_counts;

    process.stdout.write(
      `\r  ${new Date().toLocaleTimeString()} | processing: ${counts.processing} | done: ${counts.succeeded} | errors: ${counts.errored}   `
    );

    if (batch.processing_status === 'ended') {
      console.log('\n');
      return batch;
    }
  }
}

// ─── Response parsing ────────────────────────────────────────────────────────

function parseAnalysisResponse(raw, fallbackHandle) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }

  // In scraper mode, the handle is known upfront — always enforce it.
  // In upload mode, the model identifies the handle from the image — trust it
  // unless it returned 'unknown' (handle not visible in the screenshot).
  if (!parsed.handle || parsed.handle === 'unknown') {
    parsed.handle = fallbackHandle;
  }
  return parsed;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Persist an uploaded image buffer to profiles/{handle}/post_{index}.{ext}
 * so that assetUploader.js can find it when building the Canva presentation.
 * Idempotent — skips write if the file already exists.
 */
function saveUploadedImage(handle, indexOneBased, buffer, mimetype) {
  const ext = mimetype === 'image/png' ? 'png'
            : mimetype === 'image/webp' ? 'webp'
            : 'jpg';
  const dir      = path.join(PROFILES_DIR, handle);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `post_${indexOneBased}.${ext}`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
    console.log(`  [ImageStore] Saved ${handle}/post_${indexOneBased}.${ext}`);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
