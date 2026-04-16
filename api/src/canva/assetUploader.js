/**
 * assetUploader.js — Upload profile images to Canva via REST API
 *
 * Reads images from local profiles/{handle}/ directories and uploads them
 * to Canva as assets. Returns an asset map compatible with queryBuilder.js.
 *
 * Canva API: POST /v1/asset-uploads (multipart/form-data)
 * Docs: https://www.canva.dev/docs/connect/api-reference/asset-uploads/
 *
 * Concurrency capped at 3 to stay under Canva rate limits.
 */

import fs from 'fs';
import path from 'path';
import { withTokenRefresh } from './tokenManager.js';

const CANVA_UPLOAD_URL = 'https://api.canva.com/rest/v1/asset-uploads';
const CONCURRENCY = 3;
const IMAGE_TYPES = ['post_1', 'post_2', 'post_3', 'grid'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Upload profile images to Canva for the given handles.
 *
 * @param {string[]} handles         - Instagram handles to upload images for
 * @param {object}   options
 * @param {string}   options.profilesDir     - Path to profiles/ directory
 * @param {object}   [options.existingAssetMap] - Skip already-uploaded assets
 * @returns {Promise<object>} Asset map: { "{handle}_{type}": "canva_asset_id" | "MISSING" }
 */
export async function uploadProfileAssets(handles, options, canvaToken) {
  const { profilesDir, existingAssetMap = {} } = options;

  const assetMap = { ...existingAssetMap };
  const uploadTasks = [];

  for (const handle of handles) {
    const handleDir = path.join(profilesDir, handle);
    if (!fs.existsSync(handleDir)) {
      console.warn(`[AssetUploader] No directory for ${handle}, marking all as MISSING`);
      for (const type of IMAGE_TYPES) {
        assetMap[`${handle}_${type}`] = assetMap[`${handle}_${type}`] || 'MISSING';
      }
      continue;
    }

    for (const type of IMAGE_TYPES) {
      const key = `${handle}_${type}`;

      // Skip already-uploaded assets
      if (existingAssetMap[key] && existingAssetMap[key] !== 'MISSING') {
        continue;
      }

      const filePath = findImageFile(handleDir, type);
      if (!filePath) {
        assetMap[key] = 'MISSING';
        continue;
      }

      uploadTasks.push({ key, filePath, handle, type });
    }
  }

  console.log(`[AssetUploader] ${uploadTasks.length} images to upload (${handles.length} handles)`);

  // Run uploads with concurrency limit
  const results = await runConcurrent(
    uploadTasks.map(task => async () => {
      try {
        const rawName = `${task.handle}_${task.type}`;
        const assetName = rawName.length >= 50
          ? `${task.handle.slice(0, 50 - task.type.length - 1)}_${task.type}`
          : rawName;
        const assetId = await uploadImageToCanva(task.filePath, assetName, canvaToken);
        return { key: task.key, assetId };
      } catch (err) {
        console.warn(`[AssetUploader] Failed to upload ${task.key}: ${err.message}`);
        return { key: task.key, assetId: 'MISSING' };
      }
    }),
    CONCURRENCY
  );

  for (const { key, assetId } of results) {
    assetMap[key] = assetId;
  }

  const uploaded = results.filter(r => r.assetId !== 'MISSING').length;
  console.log(`[AssetUploader] ${uploaded}/${uploadTasks.length} uploaded successfully`);

  return assetMap;
}

// ─── File discovery ──────────────────────────────────────────────────────────

/**
 * Find an image file for the given type in a handle directory.
 * Tries multiple extensions: .png, .jpg, .jpeg, .webp
 */
function findImageFile(handleDir, type) {
  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(handleDir, `${type}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

// ─── Canva upload ────────────────────────────────────────────────────────────

/**
 * Upload a single image file to Canva via the asset upload API.
 *
 * @param {string} filePath  - Absolute path to the image file
 * @param {string} name      - Asset name (e.g. "alice_post_1")
 * @param {string} token     - Canva access token
 * @returns {Promise<string>} Canva asset ID
 */
async function uploadImageToCanva(filePath, name, token) {
  const nameBase64     = Buffer.from(name).toString("base64");
  const metadataJson   = JSON.stringify({ name_base64: nameBase64 });
  const fileSize   = fs.statSync(filePath).size;
  const fileStream = fs.createReadStream(filePath);

  const res = await fetch(CANVA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(fileSize),
      "Asset-Upload-Metadata": metadataJson,
    },
    body: fileStream,
    duplex: "half",
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Canva upload failed (${res.status}): ${text}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const jobId = data.job?.id;
  if (!jobId) {
    throw new Error(`No job ID in Canva upload response: ${JSON.stringify(data)}`);
  }

  return pollUploadJob(jobId, name, token);
}

/**
 * Poll GET /v1/asset-uploads/{jobId} until status is "success" or "failed".
 */
async function pollUploadJob(jobId, name, token) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${CANVA_UPLOAD_URL}/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Canva poll failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const job = data.job;

    if (job?.status === 'success') {
      const assetId = job.asset?.id;
      if (!assetId) {
        throw new Error(`Upload succeeded but no asset ID: ${JSON.stringify(data)}`);
      }
      console.log(`[AssetUploader] Uploaded ${name} → ${assetId}`);
      return assetId;
    }

    if (job?.status === 'failed') {
      throw new Error(`Canva upload job failed for ${name}: ${JSON.stringify(job)}`);
    }

    console.log(`[AssetUploader] Job ${jobId} status: ${job?.status}, waiting...`);
  }

  throw new Error(`Canva upload job timed out after ${POLL_TIMEOUT_MS}ms for ${name}`);
}

// ─── Concurrency helper ─────────────────────────────────────────────────────

async function runConcurrent(tasks, concurrency) {
  const results = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      results.push(await task());
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
