/**
 * localFetch.js — Local profile loader for hybrid mode
 *
 * Used when USE_LOCAL_PROFILES=true. Reads pre-scraped profiles from
 * /app/profiles/{handle}/ (mounted volume) and returns the same shape
 * that normalizeApifyResult() produces, so analyzeJob is unaware of
 * the difference.
 *
 * Expected layout per handle (all files optional):
 *   profiles/{handle}/grid.jpg|png|webp
 *   profiles/{handle}/post_1.jpg|png|webp
 *   profiles/{handle}/post_2.jpg|png|webp
 *   profiles/{handle}/post_3.jpg|png|webp
 *   profiles/{handle}/captions.json   — ["caption 1", "caption 2", ...]
 *   profiles/{handle}/captions.txt    — captions separated by \n---\n
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateHandle } from '../../safety/inputSanitizer.js';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = process.env.PROFILES_DIR
  ?? path.resolve(__dirname, '../../../profiles');

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function findImageFile(dir, basename) {
  for (const ext of IMAGE_EXTS) {
    const candidate = path.join(dir, basename + ext);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readBase64(filepath) {
  return fs.readFileSync(filepath).toString('base64');
}

function loadCaptions(dir) {
  const jsonPath = path.join(dir, 'captions.json');
  const txtPath  = path.join(dir, 'captions.txt');

  if (fs.existsSync(jsonPath)) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    return Array.isArray(raw) ? raw : (raw.captions ?? []);
  }
  if (fs.existsSync(txtPath)) {
    return fs.readFileSync(txtPath, 'utf-8')
      .split('\n---\n')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Load all requested handles from the local profiles directory.
 * Returns the same shape as fetchJob's normalizeApifyResult:
 *   [{ handle, captions, imagePaths: { gridData, posts: [{ data }] } }]
 *
 * Skips handles whose directory is missing or has no images (logs a warning).
 */
export function fetchProfilesFromLocal(handles) {
  const profiles = [];

  for (const rawHandle of handles) {
    const handle = rawHandle.toLowerCase().trim();

    try {
      validateHandle(handle);
    } catch {
      console.warn(`[LocalFetch] Skipping invalid handle: ${handle}`);
      continue;
    }

    const dir = path.join(PROFILES_DIR, handle);
    if (!fs.existsSync(dir)) {
      console.warn(`[LocalFetch] No directory found for @${handle} — skipping`);
      continue;
    }

    const gridFile = findImageFile(dir, 'grid');
    const gridData = gridFile ? readBase64(gridFile) : null;

    const posts = [];
    for (const suffix of ['post_1', 'post_2', 'post_3']) {
      const f = findImageFile(dir, suffix);
      if (f) posts.push({ data: readBase64(f) });
    }

    if (!gridData && posts.length === 0) {
      console.warn(`[LocalFetch] No images found for @${handle} — skipping`);
      continue;
    }

    const captions = loadCaptions(dir);

    profiles.push({ handle, captions, imagePaths: { gridData, posts } });
    console.log(`[LocalFetch] @${handle} — grid: ${gridData ? 'yes' : 'no'}, posts: ${posts.length}, captions: ${captions.length}`);
  }

  return profiles;
}
