import { describe, it, expect } from 'vitest';
import {
  hashHandle,
  pseudonymizeAnalysis,
  rehydrateAnalysis,
  sanitizeReportForStorage,
  buildErasureQuery,
  buildExpireQuery,
} from './piiHandler.js';

// ─── hashHandle ───────────────────────────────────────────────────────────────

describe('hashHandle', () => {
  it('returns a 64-char hex string (sha256)', () => {
    expect(hashHandle('brand')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same input produces same hash', () => {
    expect(hashHandle('brand')).toBe(hashHandle('brand'));
  });

  it('different handles produce different hashes', () => {
    expect(hashHandle('brand_a')).not.toBe(hashHandle('brand_b'));
  });

  it('normalises case — uppercase and lowercase produce same hash', () => {
    expect(hashHandle('Brand')).toBe(hashHandle('brand'));
  });

  it('trims whitespace before hashing', () => {
    expect(hashHandle('  brand  ')).toBe(hashHandle('brand'));
  });

  it('throws for empty handle', () => {
    expect(() => hashHandle('')).toThrow(/required/);
  });

  it('throws for null/undefined', () => {
    expect(() => hashHandle(null)).toThrow(/required/);
    expect(() => hashHandle(undefined)).toThrow(/required/);
  });

  it('hash does not contain the plaintext handle', () => {
    expect(hashHandle('secretbrand')).not.toMatch(/secretbrand/);
  });
});

// ─── pseudonymizeAnalysis ─────────────────────────────────────────────────────

describe('pseudonymizeAnalysis', () => {
  const analysis = {
    handle:            'mybrand',
    topics:            ['fashion', 'lifestyle'],
    lifestyle_cluster: 'aspirational',
  };

  it('removes the plaintext handle field (sets to null)', () => {
    const result = pseudonymizeAnalysis(analysis);
    expect(result.handle).toBeNull();
  });

  it('adds handle_hash', () => {
    const result = pseudonymizeAnalysis(analysis);
    expect(result.handle_hash).toBeTruthy();
    expect(result.handle_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handle_hash matches hashHandle(original handle)', () => {
    const result = pseudonymizeAnalysis(analysis);
    expect(result.handle_hash).toBe(hashHandle('mybrand'));
  });

  it('preserves all other fields', () => {
    const result = pseudonymizeAnalysis(analysis);
    expect(result.topics).toEqual(analysis.topics);
    expect(result.lifestyle_cluster).toBe(analysis.lifestyle_cluster);
  });

  it('does not mutate the original analysis object', () => {
    const original = { handle: 'brand', topics: ['x'] };
    pseudonymizeAnalysis(original);
    expect(original.handle).toBe('brand');
  });
});

// ─── rehydrateAnalysis ────────────────────────────────────────────────────────

describe('rehydrateAnalysis', () => {
  it('re-attaches the plaintext handle', () => {
    const stored = { handle: null, handle_hash: 'abc', topics: ['x'] };
    const result = rehydrateAnalysis(stored, 'mybrand');
    expect(result.handle).toBe('mybrand');
  });

  it('preserves all other fields', () => {
    const stored = { handle: null, handle_hash: 'abc', topics: ['fashion'] };
    const result = rehydrateAnalysis(stored, 'mybrand');
    expect(result.topics).toEqual(stored.topics);
    expect(result.handle_hash).toBe(stored.handle_hash);
  });

  it('does not mutate the stored object', () => {
    const stored = { handle: null, topics: [] };
    rehydrateAnalysis(stored, 'brand');
    expect(stored.handle).toBeNull();
  });
});

// ─── sanitizeReportForStorage ─────────────────────────────────────────────────

const reportWithHandles = {
  audience_segments: [
    {
      label:                   'Segment A',
      representative_handles:  ['user1', 'user2'],
    },
    {
      label:                   'Segment B',
      representative_handles:  ['user3'],
    },
  ],
  best_photos_for_persona_slide: ['photouser1', 'photouser2'],
  alignment_score: 0.8,
};

describe('sanitizeReportForStorage', () => {
  it('hashes representative_handles when keepHandles=false (default)', () => {
    const result = sanitizeReportForStorage(reportWithHandles);
    const handles = result.audience_segments[0].representative_handles;
    for (const h of handles) {
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('hashes best_photos_for_persona_slide handles', () => {
    const result = sanitizeReportForStorage(reportWithHandles);
    for (const h of result.best_photos_for_persona_slide) {
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('hashes are deterministic — same handle produces same hash across segments', () => {
    const report = {
      audience_segments: [
        { representative_handles: ['shared_user'] },
        { representative_handles: ['shared_user'] },
      ],
      best_photos_for_persona_slide: [],
    };
    const result = sanitizeReportForStorage(report);
    expect(result.audience_segments[0].representative_handles[0])
      .toBe(result.audience_segments[1].representative_handles[0]);
  });

  it('preserves plaintext handles when keepHandles=true', () => {
    const result = sanitizeReportForStorage(reportWithHandles, { keepHandles: true });
    expect(result.audience_segments[0].representative_handles).toEqual(['user1', 'user2']);
  });

  it('preserves non-handle fields on segments', () => {
    const result = sanitizeReportForStorage(reportWithHandles);
    expect(result.audience_segments[0].label).toBe('Segment A');
    expect(result.alignment_score).toBe(0.8);
  });

  it('handles missing representative_handles gracefully', () => {
    const report = {
      audience_segments:             [{ label: 'Empty' }],
      best_photos_for_persona_slide: [],
    };
    expect(() => sanitizeReportForStorage(report)).not.toThrow();
  });

  it('handles missing audience_segments gracefully', () => {
    const report = { best_photos_for_persona_slide: [] };
    expect(() => sanitizeReportForStorage(report)).not.toThrow();
  });

  it('does not mutate the original report', () => {
    const original = {
      audience_segments:             [{ representative_handles: ['user1'] }],
      best_photos_for_persona_slide: ['user1'],
    };
    sanitizeReportForStorage(original);
    expect(original.audience_segments[0].representative_handles[0]).toBe('user1');
  });
});

// ─── buildErasureQuery ────────────────────────────────────────────────────────

describe('buildErasureQuery', () => {
  it('returns an object with text and values', () => {
    const q = buildErasureQuery('mybrand');
    expect(q.text).toBeTruthy();
    expect(Array.isArray(q.values)).toBe(true);
  });

  it('values contains the handle hash, not the plaintext handle', () => {
    const q = buildErasureQuery('mybrand');
    expect(q.values[0]).toBe(hashHandle('mybrand'));
    expect(q.values).not.toContain('mybrand');
  });

  it('SQL targets profile_analyses table', () => {
    const q = buildErasureQuery('mybrand');
    expect(q.text).toMatch(/profile_analyses/i);
  });
});

// ─── buildExpireQuery ─────────────────────────────────────────────────────────

describe('buildExpireQuery', () => {
  it('returns an object with text and values', () => {
    const q = buildExpireQuery();
    expect(q.text).toBeTruthy();
    expect(Array.isArray(q.values)).toBe(true);
  });

  it('SQL targets profile_analyses and checks expires_at', () => {
    const q = buildExpireQuery();
    expect(q.text).toMatch(/profile_analyses/i);
    expect(q.text).toMatch(/expires_at/i);
  });
});
