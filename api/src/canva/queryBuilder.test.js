import { describe, it, expect } from 'vitest';
import {
  resolveHandle,
  buildSlidePhotoMap,
  assignTags,
  brandFitEmoji,
  buildQuery,
  QUERY_LENGTH_LIMIT,
} from './queryBuilder.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const assetMap = {
  alice_post_1: 'AAA111',
  alice_post_2: 'AAA222',
  alice_post_3: 'AAA333',
  alice_grid:   'AAA000',
  bob_post_1:   'MISSING',
  bob_post_2:   'BBB222',
  bob_post_3:   'MISSING',
  bob_grid:     'BBB000',
  carol_post_1: 'MISSING',
  carol_post_2: 'MISSING',
  carol_post_3: 'MISSING',
  carol_grid:   'MISSING',
  dave_post_1:  'DDD111',
  eve_post_1:   'EEE111',
  eve_post_2:   'EEE222',
  frank_post_1: 'FFF111',
};

const minimalReport = {
  brand: 'TestBrand',
  brand_DNA: 'Test values',
  audience_narrative: {
    intro: 'TEST AUDIENCE',
    bullets: ['bullet one', 'bullet two', 'bullet three'],
  },
  best_photos_for_persona_slide: ['alice', 'bob', 'dave', 'eve'],
  audience_segments: [
    {
      segment_name: 'Segment A',
      size_estimate: '~3 profiles',
      defining_traits: ['trait 1', 'trait 2', 'trait 3', 'trait 4'],
      representative_handles: ['alice', 'frank'],
      brand_fit: 'strong',
      content_direction: 'content idea A',
    },
    {
      segment_name: 'Segment B',
      size_estimate: '~2 profiles',
      defining_traits: ['trait X', 'trait Y'],
      representative_handles: ['eve', 'bob'],
      brand_fit: 'medium',
      content_direction: 'content idea B',
    },
  ],
  content_strategy_pillars: [
    { pillar: 'Pillar 1', body: 'Description 1', example: 'Example 1' },
    { pillar: 'Pillar 2', body: 'Description 2' },
  ],
  risks: [
    { label: 'Risk 1', detail: 'Detail one. More detail.' },
    { label: 'Risk 2', detail: 'Detail two.' },
  ],
};

// ─── resolveHandle ───────────────────────────────────────────────────────────

describe('resolveHandle', () => {
  it('returns post_1 when available', () => {
    expect(resolveHandle('alice', assetMap)).toBe('AAA111');
  });

  it('falls back to post_2 when post_1 is MISSING', () => {
    expect(resolveHandle('bob', assetMap)).toBe('BBB222');
  });

  it('returns null when all assets are MISSING', () => {
    expect(resolveHandle('carol', assetMap)).toBeNull();
  });

  it('returns null for unknown handle', () => {
    expect(resolveHandle('unknown', assetMap)).toBeNull();
  });
});

// ─── buildSlidePhotoMap ──────────────────────────────────────────────────────

describe('buildSlidePhotoMap', () => {
  it('populates persona photos from best_photos_for_persona_slide', () => {
    const { personaPhotoIds } = buildSlidePhotoMap(minimalReport, assetMap);
    expect(personaPhotoIds).toContain('AAA111'); // alice
    expect(personaPhotoIds).toContain('BBB222'); // bob (fallback to post_2)
    expect(personaPhotoIds).toContain('DDD111'); // dave
    expect(personaPhotoIds).toContain('EEE111'); // eve
    expect(personaPhotoIds).toHaveLength(4);
  });

  it('deduplicates — persona takes priority over segments', () => {
    const { personaPhotoIds, segmentPhotoIds } = buildSlidePhotoMap(minimalReport, assetMap);
    // alice's AAA111 used for persona → segment A should NOT get AAA111 again
    expect(personaPhotoIds).toContain('AAA111');
    const segAIds = segmentPhotoIds['Segment A'];
    expect(segAIds).not.toContain('AAA111');
  });

  it('limits persona to 8 photos', () => {
    const manyHandles = {
      ...minimalReport,
      best_photos_for_persona_slide: Array.from({ length: 20 }, (_, i) => `h${i}`),
    };
    const bigMap = {};
    for (let i = 0; i < 20; i++) bigMap[`h${i}_post_1`] = `ID${i}`;

    const { personaPhotoIds } = buildSlidePhotoMap(manyHandles, bigMap);
    expect(personaPhotoIds.length).toBeLessThanOrEqual(8);
  });

  it('limits segment photos to 3 each', () => {
    const bigSegment = {
      ...minimalReport,
      best_photos_for_persona_slide: [],
      audience_segments: [{
        segment_name: 'Big',
        representative_handles: ['alice', 'bob', 'dave', 'eve', 'frank'],
      }],
    };
    const { segmentPhotoIds } = buildSlidePhotoMap(bigSegment, assetMap);
    expect(segmentPhotoIds['Big'].length).toBeLessThanOrEqual(3);
  });
});

// ─── assignTags ──────────────────────────────────────────────────────────────

describe('assignTags', () => {
  it('assigns sequential tags starting from A01', () => {
    const personaIds = ['ID1', 'ID2'];
    const segIds = { 'Seg': ['ID3'] };
    const segments = [{ segment_name: 'Seg' }];

    const { allAssetIds, idToTag } = assignTags(personaIds, segIds, segments);

    expect(allAssetIds).toEqual(['ID1', 'ID2', 'ID3']);
    expect(idToTag['ID1']).toBe('[A01]');
    expect(idToTag['ID2']).toBe('[A02]');
    expect(idToTag['ID3']).toBe('[A03]');
  });

  it('does not double-register the same ID', () => {
    const personaIds = ['ID1'];
    const segIds = { 'Seg': ['ID1'] }; // same ID
    const segments = [{ segment_name: 'Seg' }];

    const { allAssetIds } = assignTags(personaIds, segIds, segments);
    expect(allAssetIds).toEqual(['ID1']);
  });
});

// ─── brandFitEmoji ───────────────────────────────────────────────────────────

describe('brandFitEmoji', () => {
  it('returns green for strong', () => {
    expect(brandFitEmoji('strong')).toBe('🟢');
  });

  it('returns yellow for medium', () => {
    expect(brandFitEmoji('medium')).toBe('🟡');
  });

  it('returns red for other values', () => {
    expect(brandFitEmoji('weak')).toBe('🔴');
  });

  it('returns empty string for null/undefined', () => {
    expect(brandFitEmoji(null)).toBe('');
    expect(brandFitEmoji(undefined)).toBe('');
  });
});

// ─── buildQuery ──────────────────────────────────────────────────────────────

describe('buildQuery', () => {
  it('returns a non-empty query string', () => {
    const { query } = buildQuery(minimalReport, assetMap);
    expect(query.length).toBeGreaterThan(0);
  });

  it('includes correct total slides count', () => {
    const { totalSlides } = buildQuery(minimalReport, assetMap);
    // 6 + 2 segments = 8
    expect(totalSlides).toBe(8);
  });

  it('includes brand name in query', () => {
    const { query } = buildQuery(minimalReport, assetMap);
    expect(query).toContain('TestBrand');
  });

  it('respects brandName override', () => {
    const { query } = buildQuery(minimalReport, assetMap, { brandName: 'Override' });
    expect(query).toContain('Override');
  });

  it('includes all expected slide markers', () => {
    const { query } = buildQuery(minimalReport, assetMap);
    expect(query).toContain('SLIDE 1 — COVER');
    expect(query).toContain('SLIDE 2 — ХТО НАША АУДИТОРІЯ');
    expect(query).toContain('SLIDE 3 — НАША ПЕРСОНА');
    expect(query).toContain('SLIDE 4 — SEGMENT A');
    expect(query).toContain('SLIDE 5 — SEGMENT B');
    expect(query).toContain('КОНТЕНТ-СТРАТЕГІЯ');
    expect(query).toContain('РИЗИКИ');
    expect(query).toContain('CLOSING');
  });

  it('includes asset manifest with tags', () => {
    const { query, allAssetIds } = buildQuery(minimalReport, assetMap);
    expect(query).toContain('ASSET MANIFEST');
    expect(query).toContain('[A01]');
    expect(allAssetIds.length).toBeGreaterThan(0);
  });

  it('compact mode reduces trait count', () => {
    const full    = buildQuery(minimalReport, assetMap, { compact: false });
    const compact = buildQuery(minimalReport, assetMap, { compact: true });
    // Full mode includes up to 4 traits, compact up to 2.
    // Segment A has 4 traits — full query is longer.
    expect(compact.query.length).toBeLessThan(full.query.length);
  });

  it('compact mode truncates risk details to first sentence', () => {
    const { query } = buildQuery(minimalReport, assetMap, { compact: true });
    // Risk 1 detail is "Detail one. More detail." — compact should only have "Detail one."
    expect(query).toContain('Detail one.');
    expect(query).not.toContain('More detail.');
  });

  it('handles empty report gracefully', () => {
    const emptyReport = { brand: 'Empty' };
    const { query, totalSlides } = buildQuery(emptyReport, {});
    expect(query).toContain('Empty');
    expect(totalSlides).toBe(6); // 6 + 0 segments
  });

  it('returns allAssetIds matching asset map values', () => {
    const { allAssetIds } = buildQuery(minimalReport, assetMap);
    for (const id of allAssetIds) {
      expect(id).not.toBe('MISSING');
      expect(Object.values(assetMap)).toContain(id);
    }
  });
});
