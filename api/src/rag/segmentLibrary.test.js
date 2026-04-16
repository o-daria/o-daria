/**
 * segmentLibrary.test.js
 *
 * Integration tests for the cross-client segment knowledge base.
 *
 * Key invariants tested:
 *   1. Tenant isolation: findSimilarSegments EXCLUDES the requesting tenant
 *   2. Append-only: no UPDATE or DELETE SQL ever executed
 *   3. Round-trip: indexed segments are retrievable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared state for SQL capture ────────────────────────────────────────────

const capturedQueries = [];
const fakeRows        = [];

const fakeQuery = async (text, values) => {
  capturedQueries.push({ text, values });
  return { rows: fakeRows };
};

// Fixed 768-dim embedding (Ollama default)
const ZERO_VECTOR   = Array(768).fill(0);
const PG_VECTOR_STR = `[${ZERO_VECTOR.join(',')}]`;

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../db/client.js', () => ({
  query: (...args) => fakeQuery(...args),
}));

vi.mock('./embeddings.js', () => ({
  generateEmbedding:    async () => ZERO_VECTOR,
  formatEmbeddingForPg: ()       => PG_VECTOR_STR,
}));

const { indexReportSegments, findSimilarSegments } = await import('./segmentLibrary.js');

// ─── indexReportSegments ──────────────────────────────────────────────────────

describe('indexReportSegments', () => {
  beforeEach(() => { capturedQueries.length = 0; });

  it('inserts one row per segment', async () => {
    const segments = [
      { segment_name: 'Eco Shoppers',   defining_traits: ['green', 'frugal'] },
      { segment_name: 'Urban Creatives', defining_traits: ['design', 'tech'] },
    ];

    await indexReportSegments(segments, 'tenant-a');

    const insertQueries = capturedQueries.filter(q => /INSERT/i.test(q.text));
    expect(insertQueries.length).toBe(2);
  });

  it('inserts into segment_library table', async () => {
    await indexReportSegments([{ segment_name: 'Test' }], 'tenant-a');

    const sql = capturedQueries[0].text;
    expect(sql).toMatch(/segment_library/i);
    expect(sql).toMatch(/INSERT/i);
  });

  it('tags each row with the tenant_id', async () => {
    await indexReportSegments([{ segment_name: 'Segment X' }], 'tenant-xyz');

    const { values } = capturedQueries[0];
    expect(values[0]).toBe('tenant-xyz');
  });

  it('never executes UPDATE or DELETE — append-only invariant', async () => {
    await indexReportSegments(
      [{ segment_name: 'A' }, { segment_name: 'B' }],
      'tenant-a'
    );

    const destructive = capturedQueries.filter(q =>
      /^\s*(UPDATE|DELETE)/i.test(q.text)
    );
    expect(destructive.length).toBe(0);
  });
});

// ─── findSimilarSegments — tenant isolation invariant ─────────────────────────

describe('findSimilarSegments — tenant isolation', () => {
  beforeEach(() => { capturedQueries.length = 0; });

  it('passes the requesting tenant as the EXCLUSION parameter', async () => {
    await findSimilarSegments([{ topics: ['fashion'] }], 'tenant-b');

    const selectQuery = capturedQueries.find(q => /SELECT/i.test(q.text));
    expect(selectQuery).toBeTruthy();

    // The SQL must contain tenant_id != $2 (or equivalent exclusion)
    expect(selectQuery.text).toMatch(/tenant_id\s*!=\s*\$2/i);

    // The requesting tenant must be in the params
    expect(selectQuery.values[1]).toBe('tenant-b');
  });

  it('requesting tenant is the EXCLUSION — other tenants are included', async () => {
    await findSimilarSegments([{ topics: ['art'] }], 'my-tenant');

    const selectQuery = capturedQueries.find(q => /SELECT/i.test(q.text));
    // Verify it's not WHERE tenant_id = $2 (inclusion of own data)
    expect(selectQuery.text).not.toMatch(/WHERE\s+tenant_id\s*=\s*\$2(?!\s*!)/i);
  });

  it('respects the k limit parameter', async () => {
    await findSimilarSegments([{ topics: ['sport'] }], 'tenant-a', { k: 3 });

    const selectQuery = capturedQueries.find(q => /SELECT/i.test(q.text));
    expect(selectQuery.values).toContain(3);
  });

  it('defaults to k=5 when not specified', async () => {
    await findSimilarSegments([{ topics: ['travel'] }], 'tenant-a');

    const selectQuery = capturedQueries.find(q => /SELECT/i.test(q.text));
    expect(selectQuery.values).toContain(5);
  });

  it('never executes UPDATE or DELETE', async () => {
    await findSimilarSegments([{ topics: ['x'] }], 'tenant-a');

    const destructive = capturedQueries.filter(q =>
      /^\s*(UPDATE|DELETE)/i.test(q.text)
    );
    expect(destructive.length).toBe(0);
  });
});
