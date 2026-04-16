/**
 * src/prompts/registry.js
 *
 * Versioned prompt registry.
 *
 * All prompts are treated as immutable versioned assets. When a prompt
 * is updated, a new version is created — the old version is never mutated.
 * This means any report can be reproduced byte-for-byte by replaying the
 * same prompt version that was used at generation time.
 *
 * In production, `get()` reads from the prompt_versions DB table.
 * For local development, the in-process REGISTRY map is used as a fallback.
 */

import { ANALYSIS_SYSTEM_PROMPT_V2 }    from './templates/analysis.js';
import { AGGREGATION_SYSTEM_PROMPT_V2 } from './templates/aggregation.js';
import { BRAND_DNA_COMPILER_PROMPT }    from './templates/brandDna.js';
import { VALIDATION_SYSTEM_PROMPT }     from './templates/validation.js';

// ─── In-process registry (source of truth for local dev / tests) ─────────────
// Format: name → { version, body, modelHint }

const REGISTRY = new Map();

export function register(name, version, body, modelHint = null) {
  REGISTRY.set(`${name}@${version}`, { name, version, body, modelHint });
  // Also set as the "latest" pointer for this name
  REGISTRY.set(`${name}@latest`, { name, version, body, modelHint });
}

/**
 * Get a prompt by name and optional version.
 * @param {string} name     - Prompt name, e.g. 'analysis_system'
 * @param {string} version  - Semver string or 'latest' (default)
 * @param {object} db       - Optional pg-pool instance; if provided, reads from DB first
 * @returns {{ content: string, version: string, modelHint: string|null }}
 */
export async function getPrompt(name, version = 'latest', db = null) {
  // 1. Try DB (production path)
  if (db) {
    try {
      const q = version === 'latest'
        ? `SELECT body, version, model_hint FROM prompt_versions
           WHERE name = $1 ORDER BY created_at DESC LIMIT 1`
        : `SELECT body, version, model_hint FROM prompt_versions
           WHERE name = $1 AND version = $2 LIMIT 1`;
      const params = version === 'latest' ? [name] : [name, version];
      const { rows } = await db.query(q, params);
      if (rows.length > 0) {
        return { content: rows[0].body, version: rows[0].version, modelHint: rows[0].model_hint };
      }
    } catch {
      // DB unavailable — fall through to in-process registry
    }
  }
 
  // 2. In-process registry (dev / fallback)
  const key  = `${name}@${version}`;
  const entry = REGISTRY.get(key);
  if (!entry) {
    throw new Error(`Prompt not found: ${name}@${version}. Did you forget to call register()?`);
  }
  return { content: entry.body, version: entry.version, modelHint: entry.modelHint };
}

/**
 * Returns a version snapshot for a specific set of prompt names.
 * Used by aggregateJob to stamp the integrity block with only the prompts
 * that were active in that pipeline run.
 * @param {string[]} names - Prompt names to include, e.g. ['analysis', 'aggregation']
 * @returns {Promise<Record<string, string>>}
 */
export async function snapshotVersions(names) {
  const all = getCurrentVersionSnapshot();
  const snapshot = {};
  for (const name of names) {
    if (name in all) snapshot[name] = all[name];
  }
  return snapshot;
}

/**
 * Returns a snapshot of all prompt names and their current latest version.
 * Used to stamp reports with the prompt versions used at generation time.
 */
export function getCurrentVersionSnapshot() {
  const snapshot = {};
  for (const [key, entry] of REGISTRY.entries()) {
    if (key.endsWith('@latest')) {
      snapshot[entry.name] = entry.version;
    }
  }
  return snapshot;
}

/**
 * Registers all current prompt versions in-process.
 * Called at startup — idempotent, safe to call multiple times.
 */
export function seedPrompts() {
  register('analysis',    'v2.0', ANALYSIS_SYSTEM_PROMPT_V2,    'claude-sonnet-4-6');
  register('aggregation', 'v2.1', AGGREGATION_SYSTEM_PROMPT_V2, 'claude-haiku-4-5-20251001');
  register('brand_dna',   'v1.0', BRAND_DNA_COMPILER_PROMPT,    'claude-haiku-4-5-20251001');
  register('validation',  'v1.0', VALIDATION_SYSTEM_PROMPT,     'claude-haiku-4-5-20251001');
}

/**
 * Saves a new prompt version to the DB and registers it in-process.
 * Only callable by platform admins.
 */
export async function publish(name, version, body, modelHint = null, db) {
  if (!db) throw new Error('publish() requires a DB connection');
  await db.query(
    `INSERT INTO prompt_versions (name, version, body, model_hint)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name, version) DO NOTHING`,
    [name, version, body, modelHint]
  );
  register(name, version, body, modelHint);
  return { name, version };
}
