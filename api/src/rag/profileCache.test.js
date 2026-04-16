/**
 * profileCache.test.js
 *
 * Tests the ProfileCache class directly (injected DB for easy mocking).
 *
 * The class accepts a `db` instance in its constructor, so no module mocking is needed
 * for the DB. Embeddings are mocked via vi.mock().
 *
 * Key invariants:
 *   - Cache miss when no rows returned
 *   - Staleness: if profile_hash changed, cache is invalidated and null returned
 *   - set() stores handle, analysis, embedding; uses ON CONFLICT upsert
 *   - getSimilarProfiles() excludes specified handles
 *   - partitionHandles() correctly partitions cached vs to-analyze
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Fake DB factory ──────────────────────────────────────────────────────────

function makeFakeDb(rows = [], capturedQueries = []) {
  return {
    rows,
    captured: capturedQueries,
    query: async (text, values) => {
      capturedQueries.push({ text, values });
      return { rows };
    },
  };
}

// ─── Mock embeddings ──────────────────────────────────────────────────────────

const ZERO_VECTOR = Array(768).fill(0);

vi.mock('./embeddings.js', () => ({
  generateEmbedding:    async () => ZERO_VECTOR,
  analysisToEmbedText:  a => [a.topics?.join(','), a.lifestyle_cluster].filter(Boolean).join('. '),
  formatEmbeddingForPg: e => `[${e.join(',')}]`,
}));

const { ProfileCache } = await import('./profileCache.js');

// ─── get() — cache miss / hit ─────────────────────────────────────────────────

describe('ProfileCache.get()', () => {
  it('returns null on cache miss (no rows)', async () => {
    const db    = makeFakeDb([]);
    const cache = new ProfileCache(db);

    const result = await cache.get('mybrand');
    expect(result).toBeNull();
  });

  it('returns cached analysis on hit', async () => {
    const analysis = { handle: null, topics: ['fashion'] };
    const db = makeFakeDb([{
      analysis,
      profile_hash: 'abc',
      analyzed_at:  new Date().toISOString(),
      expires_at:   new Date(Date.now() + 86400000).toISOString(),
      prompt_version: 'v2.0',
    }]);
    const cache = new ProfileCache(db);

    const result = await cache.get('mybrand');
    expect(result).toBeTruthy();
    expect(result.fromCache).toBe(true);
    expect(result.analysis).toEqual(analysis);
  });

  it('returns fromCache:true and promptVersion on hit', async () => {
    const db = makeFakeDb([{
      analysis:       { topics: ['travel'] },
      profile_hash:   'hash1',
      analyzed_at:    new Date().toISOString(),
      expires_at:     new Date(Date.now() + 86400000).toISOString(),
      prompt_version: 'v2.0',
    }]);
    const cache = new ProfileCache(db);

    const result = await cache.get('handle');
    expect(result.fromCache).toBe(true);
    expect(result.promptVersion).toBe('v2.0');
  });

  it('returns null and invalidates when profile_hash has changed', async () => {
    const capturedQueries = [];
    const db = makeFakeDb(
      [{
        analysis:       { topics: ['art'] },
        profile_hash:   'old-hash',  // stored hash
        analyzed_at:    new Date().toISOString(),
        expires_at:     new Date(Date.now() + 86400000).toISOString(),
        prompt_version: 'v2.0',
      }],
      capturedQueries
    );
    const cache = new ProfileCache(db);

    const result = await cache.get('brand', 'new-hash'); // different hash
    expect(result).toBeNull();

    // Verify invalidation (DELETE) was called
    const deleteQuery = capturedQueries.find(q => /DELETE/i.test(q.text));
    expect(deleteQuery).toBeTruthy();
  });
});

// ─── set() ────────────────────────────────────────────────────────────────────

describe('ProfileCache.set()', () => {
  it('issues an INSERT or ON CONFLICT UPDATE query', async () => {
    const capturedQueries = [];
    const db    = makeFakeDb([], capturedQueries);
    const cache = new ProfileCache(db);

    const analysis = { topics: ['lifestyle'], lifestyle_cluster: 'aspirational' };
    await cache.set('brand', analysis, 'hash1', 'v2.0', 'claude-sonnet-4-6');

    const insertQuery = capturedQueries.find(q => /INSERT/i.test(q.text));
    expect(insertQuery).toBeTruthy();
    expect(insertQuery.text).toMatch(/ON CONFLICT/i);
  });

  it('stores the handle as first query param', async () => {
    const capturedQueries = [];
    const db    = makeFakeDb([], capturedQueries);
    const cache = new ProfileCache(db);

    await cache.set('mybrand', { topics: ['x'] }, 'h', 'v', 'm');

    const q = capturedQueries.find(q => /INSERT/i.test(q.text));
    expect(q.values[0]).toBe('mybrand');
  });

  it('stores analysis as serialized JSON', async () => {
    const capturedQueries = [];
    const db    = makeFakeDb([], capturedQueries);
    const cache = new ProfileCache(db);

    const analysis = { topics: ['fashion'], lifestyle_cluster: 'aspirational' };
    await cache.set('brand', analysis, 'h', 'v', 'm');

    const q = capturedQueries.find(q => /INSERT/i.test(q.text));
    const storedAnalysis = JSON.parse(q.values[1]);
    expect(storedAnalysis).toEqual(analysis);
  });
});

// ─── partitionHandles() ───────────────────────────────────────────────────────

describe('ProfileCache.partitionHandles()', () => {
  it('returns empty arrays for empty input', async () => {
    const cache = new ProfileCache(makeFakeDb([]));

    const result = await cache.partitionHandles([]);
    expect(result).toEqual({ cached: [], toAnalyze: [] });
  });

  it('places handles with matching cached rows into cached[]', async () => {
    const db = makeFakeDb([
      { handle: 'brand1', profile_hash: null },
      { handle: 'brand2', profile_hash: null },
    ]);
    const cache = new ProfileCache(db);

    const result = await cache.partitionHandles(['brand1', 'brand2', 'brand3']);
    expect(result.cached).toContain('brand1');
    expect(result.cached).toContain('brand2');
    expect(result.toAnalyze).toContain('brand3');
  });

  it('treats a handle as toAnalyze if not in cached rows', async () => {
    const cache = new ProfileCache(makeFakeDb([]));

    const result = await cache.partitionHandles(['new_brand']);
    expect(result.cached).toEqual([]);
    expect(result.toAnalyze).toEqual(['new_brand']);
  });

  it('invalidates cached entry when provided hash differs', async () => {
    const db = makeFakeDb([
      { handle: 'stale_brand', profile_hash: 'old-hash' },
    ]);
    const cache = new ProfileCache(db);

    const result = await cache.partitionHandles(
      ['stale_brand'],
      { stale_brand: 'new-hash' }  // hash changed → should go to toAnalyze
    );
    expect(result.toAnalyze).toContain('stale_brand');
    expect(result.cached).not.toContain('stale_brand');
  });
});

// ─── getSimilarProfiles() ─────────────────────────────────────────────────────

describe('ProfileCache.getSimilarProfiles()', () => {
  it('queries with exclusion for provided handles', async () => {
    const capturedQueries = [];
    const db    = makeFakeDb([], capturedQueries);
    const cache = new ProfileCache(db);

    await cache.getSimilarProfiles('fashion lifestyle', 2, ['excluded_brand']);

    const selectQuery = capturedQueries.find(q => /SELECT/i.test(q.text));
    expect(selectQuery).toBeTruthy();
    expect(selectQuery.text).toMatch(/NOT IN/i);
    expect(selectQuery.values).toContain('excluded_brand');
  });

  it('returns mapped result objects with handle, analysis, similarity fields', async () => {
    const db = makeFakeDb([
      { handle: 'brand_a', analysis: { topics: ['fashion'] }, similarity: 0.92 },
    ]);
    const cache = new ProfileCache(db);

    const results = await cache.getSimilarProfiles('fashion');
    expect(results.length).toBe(1);
    expect(results[0]).toHaveProperty('handle');
    expect(results[0]).toHaveProperty('analysis');
    expect(results[0]).toHaveProperty('similarity');
  });

  it('defaults to k=2 when not specified', async () => {
    const capturedQueries = [];
    const db    = makeFakeDb([], capturedQueries);
    const cache = new ProfileCache(db);

    await cache.getSimilarProfiles('test text');

    const q = capturedQueries.find(q => /LIMIT/i.test(q.text));
    expect(q.values).toContain(2);
  });
});
