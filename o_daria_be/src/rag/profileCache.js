/**
 * src/rag/profileCache.js
 *
 * pgvector-backed profile analysis cache.
 *
 * Two functions:
 *   1. Cache hit/miss for identical handles — skip re-analysis if fresh
 *   2. Semantic few-shot retrieval — find k most similar profiles to use
 *      as few-shot examples in the analysis prompt
 *
 * Tenant isolation: the cache is handle-scoped and shared across tenants.
 * Tenant isolation is enforced at the AGGREGATION layer, not here.
 * Individual profile analyses are not commercially sensitive (they describe
 * public Instagram profiles). Only the synthesized report is tenant-private.
 */

import pool                                        from '../db/client.js';
import { generateEmbedding, analysisToEmbedText } from './embeddings.js';

const CACHE_TTL_DAYS   = 45;
const STALE_CHECK_DAYS = 3;   // Re-check profile_hash after this many days

export class ProfileCache {
  /**
   * @param {object} db  - pg-pool instance
   */
  constructor(db) {
    this.db = db;
  }

  // ─── Cache hit check ────────────────────────────────────────────────────────

  /**
   * Returns a cached analysis for the given handle if it exists and is fresh.
   * Returns null if not cached, expired, or stale (profile changed).
   *
   * @param {string} handle
   * @param {string} currentProfileHash  - Lightweight hash of current profile state
   * @returns {Promise<object|null>}
   */
  async get(handle, currentProfileHash = null) {
    const { rows } = await this.db.query(
      `SELECT analysis, profile_hash, analyzed_at, expires_at, prompt_version
       FROM profile_analyses
       WHERE handle = $1 AND expires_at > NOW()
       LIMIT 1`,
      [handle]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    // If caller provides a hash, check for staleness
    if (currentProfileHash && row.profile_hash !== currentProfileHash) {
      // Profile changed since last analysis — invalidate
      await this.invalidate(handle);
      return null;
    }

    return {
      analysis:      row.analysis,
      cachedAt:      row.analyzed_at,
      promptVersion: row.prompt_version,
      fromCache:     true,
    };
  }

  // ─── Cache write ────────────────────────────────────────────────────────────

  /**
   * Stores a completed analysis in the cache with its embedding.
   *
   * @param {string} handle
   * @param {object} analysis       - Parsed analysis JSON
   * @param {string} profileHash    - Lightweight hash of profile state at analysis time
   * @param {string} promptVersion  - Version string from the registry
   * @param {string} modelUsed
   */
  async set(handle, analysis, profileHash, promptVersion, modelUsed) {
    const embedText = analysisToEmbedText(analysis);
    const embedding = await generateEmbedding(embedText);
    const vectorLiteral = `[${embedding.join(',')}]`;

    await this.db.query(
      `INSERT INTO profile_analyses
         (handle, analysis, embedding, profile_hash, prompt_version, model_used, expires_at)
       VALUES ($1, $2, $3::vector, $4, $5, $6, NOW() + INTERVAL '${CACHE_TTL_DAYS} days')
       ON CONFLICT (handle) DO UPDATE SET
         analysis      = EXCLUDED.analysis,
         embedding     = EXCLUDED.embedding,
         profile_hash  = EXCLUDED.profile_hash,
         prompt_version= EXCLUDED.prompt_version,
         model_used    = EXCLUDED.model_used,
         analyzed_at   = NOW(),
         expires_at    = NOW() + INTERVAL '${CACHE_TTL_DAYS} days'`,
      [handle, JSON.stringify(analysis), vectorLiteral, profileHash, promptVersion, modelUsed]
    );
  }

  // ─── Semantic few-shot retrieval ────────────────────────────────────────────

  /**
   * Returns the k most semantically similar cached profiles to use as
   * few-shot examples in the analysis prompt.
   *
   * The caller provides a text description of the profile being analyzed
   * (e.g. from Pass 1 identification: handle + rough type). The cache
   * returns the closest k analyses by cosine similarity.
   *
   * @param {string} queryText   - Text description of the profile to be analyzed
   * @param {number} k           - Number of examples to retrieve (default 2)
   * @param {string[]} excludeHandles - Handles to exclude (the one being analyzed)
   * @returns {Promise<Array>}   - Array of { handle, analysis, similarity }
   */
  async getSimilarProfiles(queryText, k = 2, excludeHandles = []) {
    const embedding     = await generateEmbedding(queryText);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const placeholders = excludeHandles.length > 0
      ? `AND handle NOT IN (${excludeHandles.map((_, i) => `$${i + 3}`).join(',')})`
      : '';

    const params = [vectorLiteral, k, ...excludeHandles];

    const { rows } = await this.db.query(
      `SELECT handle, analysis,
              1 - (embedding <=> $1::vector) AS similarity
       FROM profile_analyses
       WHERE expires_at > NOW()
       ${placeholders}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      params
    );

    return rows.map((r) => ({
      handle:     r.handle,
      analysis:   r.analysis,
      similarity: r.similarity,
    }));
  }

  // ─── Batch check (used by orchestrator to determine which handles need analysis) ─

  /**
   * Given a list of handles, returns two lists:
   *   - cached:   handles with a fresh, valid cache entry
   *   - toAnalyze: handles that need a new analysis run
   *
   * @param {string[]} handles
   * @param {object}   profileHashes  - { handle: hash } map (optional)
   * @returns {Promise<{ cached: string[], toAnalyze: string[] }>}
   */
  async partitionHandles(handles, profileHashes = {}) {
    if (handles.length === 0) return { cached: [], toAnalyze: [] };

    const placeholders = handles.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await this.db.query(
      `SELECT handle, profile_hash FROM profile_analyses
       WHERE handle IN (${placeholders}) AND expires_at > NOW()`,
      handles
    );

    const freshHandles = new Set(
      rows
        .filter((r) => {
          const currentHash = profileHashes[r.handle];
          // Accept cached entry if no hash provided, or if hash matches
          return !currentHash || currentHash === r.profile_hash;
        })
        .map((r) => r.handle)
    );

    return {
      cached:     handles.filter((h) => freshHandles.has(h)),
      toAnalyze:  handles.filter((h) => !freshHandles.has(h)),
    };
  }

  // ─── Invalidation ───────────────────────────────────────────────────────────

  async invalidate(handle) {
    await this.db.query('DELETE FROM profile_analyses WHERE handle = $1', [handle]);
  }

  async bulkInvalidate(handles) {
    if (handles.length === 0) return;
    const placeholders = handles.map((_, i) => `$${i + 1}`).join(',');
    await this.db.query(`DELETE FROM profile_analyses WHERE handle IN (${placeholders})`, handles);
  }
}

// ─── Module-level singleton (used by pipeline jobs) ───────────────────────────

const _cache = new ProfileCache(pool);

/**
 * Returns a cached analysis for the given handle, or null on miss/expiry.
 *
 * @param {string} handle
 * @param {string} [profileHash]
 * @returns {Promise<object|null>}
 */
export const getCachedAnalysis = (handle, profileHash = null) =>
  _cache.get(handle, profileHash);

/**
 * Stores a completed analysis in the cache with its embedding.
 * promptVersion and modelUsed are optional; omit when not available at call site.
 *
 * @param {string} handle
 * @param {object} analysis
 * @param {string} [profileHash]
 * @param {string} [promptVersion]
 * @param {string} [modelUsed]
 */
export const setCachedAnalysis = (handle, analysis, profileHash = null, promptVersion = null, modelUsed = null) =>
  _cache.set(handle, analysis, profileHash, promptVersion, modelUsed);

/**
 * Returns the k most semantically similar cached profiles to use as
 * few-shot calibration examples in the analysis prompt.
 *
 * Accepts a partial analysis object — converts it to embed text internally
 * so the caller does not need to import analysisToEmbedText.
 *
 * @param {object} partialAnalysis         - { topics, lifestyle_cluster, observed_signals, … }
 * @param {object} [opts]
 * @param {number} [opts.k=2]              - Number of results
 * @param {string} [opts.excludeHandle]    - Handle to exclude from results
 * @returns {Promise<Array<{ handle, analysis, similarity }>>}
 */
export async function findSimilarProfiles(partialAnalysis, { k = 2, excludeHandle } = {}) {
  const queryText = analysisToEmbedText(partialAnalysis);
  const excludes  = excludeHandle ? [excludeHandle] : [];
  return _cache.getSimilarProfiles(queryText, k, excludes);
}