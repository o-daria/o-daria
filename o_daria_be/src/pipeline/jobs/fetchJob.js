/**
 * fetchJob.js — Pipeline Job 1
 *
 * Fetches public Instagram profile data via Apify.
 * Replaces the manual PNG upload flow from the original upload_assets.js.
 *
 * Returns a normalized profile array matching the shape that analyzeJob expects:
 *   [{ handle, captions, imagePaths: { gridData, posts: [{ data }] } }]
 *
 * Apify actor: apify/instagram-profile-scraper
 *   - Returns profile grid images, individual post images, captions
 *   - Cost: ~$0.05 per profile at standard tier
 *
 * Concurrency: 5 profiles at a time (Apify rate limits)
 *
 * Image data is kept in memory (Buffer) during the pipeline run.
 * Raw images are NOT persisted to S3 beyond the job lifecycle —
 * only analyses are cached. This satisfies the PII retention model.
 *
 * For production: if you want to retain images for Canva upload,
 * add an S3 write step here and return S3 keys instead of Buffers.
 */

import { auditJob }             from './auditTrail.js';
import { validateHandle }       from '../../safety/inputSanitizer.js';
import { fetchProfilesFromLocal } from './localFetch.js';

const APIFY_TOKEN       = process.env.APIFY_TOKEN;
const APIFY_ACTOR       = 'apify~instagram-profile-scraper';
const APIFY_BASE_URL    = 'https://api.apify.com/v2';
const CONCURRENCY       = 5;
const MAX_POSTS_PER_PROFILE = 3;

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * @param {string[]} handles   - Validated Instagram handles
 * @param {string}   reportId  - For audit logging
 * @returns {Promise<object[]>} - Normalized profile data array
 */
export async function fetchProfiles(handles, reportId) {
  await auditJob(reportId, 'fetch', 'started', { handleCount: handles.length });

  // Hybrid mode: read from mounted profiles/ volume instead of Apify
  if (process.env.USE_LOCAL_PROFILES === 'true') {
    console.log('[Fetch] USE_LOCAL_PROFILES=true — reading from local profiles/ directory');
    const profiles = fetchProfilesFromLocal(handles);
    await auditJob(reportId, 'fetch', 'completed', {
      requested: handles.length,
      returned:  profiles.length,
      missing:   handles.length - profiles.length,
      source:    'local',
    });
    console.log(`[Fetch] ${profiles.length}/${handles.length} profiles loaded from disk`);
    return profiles;
  }

  // Run Apify scrape for all handles
  const runId   = await startApifyRun(handles);
  const results = await waitForApifyRun(runId);

  // Normalize results into the shape analyzeJob expects
  const profiles = await Promise.all(
    results
      .filter(r => r && r.username)
      .map(r => normalizeApifyResult(r))
  );

  const successful = profiles.filter(Boolean);

  await auditJob(reportId, 'fetch', 'completed', {
    requested:   handles.length,
    returned:    successful.length,
    missing:     handles.length - successful.length,
  });

  console.log(`[Fetch] ${successful.length}/${handles.length} profiles fetched`);
  return successful;
}

// ─── Apify integration ────────────────────────────────────────────────────────

async function startApifyRun(handles) {
  if (!APIFY_TOKEN) throw new Error('APIFY_TOKEN is not set');

  const res = await fetch(
    `${APIFY_BASE_URL}/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames:       handles,
        resultsLimit:    MAX_POSTS_PER_PROFILE + 1,   // +1 for the grid/profile image
        scrapeStories:   false,
        scrapeHighlights: false,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify run start failed [${res.status}]: ${body}`);
  }

  const data = await res.json();
  const runId = data?.data?.id;
  if (!runId) throw new Error(`No run ID in Apify response: ${JSON.stringify(data)}`);

  console.log(`[Fetch] Apify run started: ${runId}`);
  return runId;
}

async function waitForApifyRun(runId) {
  const pollInterval = 5000;
  const maxWaitMs    = 5 * 60 * 1000;  // 5 minutes
  const start        = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await sleep(pollInterval);

    const res = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const data = await res.json();
    const status = data?.data?.status;

    if (status === 'SUCCEEDED') {
      return fetchApifyDataset(data.data.defaultDatasetId);
    }
    if (status === 'FAILED' || status === 'ABORTED') {
      throw new Error(`Apify run ${runId} ended with status: ${status}`);
    }

    process.stdout.write(`\r  [Fetch] Apify status: ${status} (${Math.round((Date.now()-start)/1000)}s)`);
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWaitMs / 1000}s`);
}

async function fetchApifyDataset(datasetId) {
  const res = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`
  );
  if (!res.ok) throw new Error(`Dataset fetch failed [${res.status}]`);
  return res.json();
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Converts an Apify result into the shape analyzeJob.js expects.
 *
 * Apify returns image URLs — we fetch them into Buffers here.
 * Buffers live only in memory during the pipeline run (no S3 write).
 */
async function normalizeApifyResult(apifyProfile) {
  const handle = apifyProfile.username?.toLowerCase();
  if (!handle) return null;

  try {
    validateHandle(handle);
  } catch {
    console.warn(`[Fetch] Skipping invalid handle from Apify: ${handle}`);
    return null;
  }

  // Fetch profile grid image (first image in latestPosts or profilePicUrl)
  const gridUrl  = apifyProfile.profilePicUrlHD ?? apifyProfile.profilePicUrl;
  const gridData = gridUrl ? await fetchImageAsBase64(gridUrl) : null;

  // Fetch up to MAX_POSTS_PER_PROFILE post images + their captions
  const posts    = (apifyProfile.latestPosts ?? []).slice(0, MAX_POSTS_PER_PROFILE);
  const postData = await runConcurrent(
    posts.map(post => async () => {
      const imageUrl = post.displayUrl ?? post.thumbnailSrc;
      if (!imageUrl) return null;
      const data = await fetchImageAsBase64(imageUrl).catch(() => null);
      return data ? { data, caption: post.caption ?? '' } : null;
    }),
    CONCURRENCY
  );

  const validPosts = postData.filter(Boolean);

  return {
    handle,
    captions:   validPosts.map(p => p.caption),
    imagePaths: {
      gridData,
      posts: validPosts.map(p => ({ data: p.data })),
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed [${res.status}]: ${url}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function runConcurrent(tasks, concurrency) {
  const results = [];
  const queue   = [...tasks];
  async function worker() {
    while (queue.length) {
      results.push(await queue.shift()());
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
