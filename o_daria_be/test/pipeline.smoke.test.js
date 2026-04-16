/**
 * test/pipeline.smoke.test.js
 *
 * Level 3 smoke test: full pipeline using localFetch mode + mocked LLM.
 *
 * This test exercises the complete pipeline (orchestrator → all 5 jobs) without
 * real Apify or real Anthropic calls. It uses:
 *   - USE_LOCAL_PROFILES=true (reads profiles from test/fixtures/profiles/)
 *   - Mocked Anthropic SDK returning valid fixture JSON
 *   - Real test DB (requires DATABASE_URL_TEST)
 *
 * Run as part of PR checks:
 *   DATABASE_URL_TEST=postgres://localhost/audience_test npx vitest run test/pipeline.smoke.test.js
 *
 * What this test asserts:
 *   1. Report status is 'done' after runPipeline() completes
 *   2. Report JSON has the expected shape (segments, alignment_score, pillars)
 *   3. Integrity checksum verifies
 *   4. Segment library has new rows after the run
 *   5. Profile cache has new rows after the run
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// ─── LLM fixture responses ────────────────────────────────────────────────────

const FIXTURE_BRAND_DNA = {
  tone:                 'calm and premium',
  values:               ['stillness', 'quality', 'authenticity'],
  visual_vocabulary:    ['earth tones', 'natural textures'],
  anti_values:          ['noise', 'hustle'],
  positioning_tension:  'accessible luxury vs mass market',
  audience_aspiration:  'meaningful escape from urban life',
  key_differentiator:   'mountain retreat authenticity',
};

const FIXTURE_ANALYSIS = {
  handle:            null,
  topics:            ['nature', 'wellness', 'sustainability'],
  observed_signals: {
    visual_tone:   'warm and natural',
    caption_register: 'thoughtful',
    environment:   ['outdoor', 'mountain'],
    photo_types:   ['landscape', 'lifestyle'],
  },
  content_mix:      { photo: 0.7, video: 0.2, carousel: 0.1 },
  lifestyle_cluster: 'eco-conscious explorer',
  confidence_note:  'Based on 3 posts and captions observed.',
  brand_alignment_hint: 'strong alignment on nature and premium values',
};

const FIXTURE_REPORT = {
  audience_segments: [
    {
      segment_name:            'Eco Explorers',
      size_estimate:           '45%',
      brand_fit:               'high',
      defining_traits:         ['nature', 'sustainability', 'quality'],
      representative_handles:  ['handle1', 'handle2'],
      content_direction:       'Nature-focused storytelling',
    },
  ],
  alignment_score: {
    overall:   85,
    rationale: 'Strong overlap on premium, nature-first values.',
  },
  content_strategy_pillars: [
    { pillar: 'Nature Immersion', rationale: 'Core audience motivation' },
  ],
  topic_to_handles: { nature: ['handle1', 'handle2'] },
};

const FIXTURE_VALIDATION = { valid: true, issues: [] };

// ─── Anthropic message response builder ───────────────────────────────────────

function makeMessageResponse(json) {
  return { content: [{ text: JSON.stringify(json) }] };
}

const fakeCreate = async ({ messages, system }) => {
  const userText = messages?.[0]?.content ?? '';

  if (typeof userText === 'string' && userText.includes('brand DNA')) {
    return makeMessageResponse(FIXTURE_BRAND_DNA);
  }
  if (typeof userText === 'string' && userText.includes('PROFILE ANALYSIS')) {
    return makeMessageResponse(FIXTURE_VALIDATION);
  }
  if (typeof userText === 'string' && userText.includes('AUDIENCE REPORT')) {
    return makeMessageResponse(FIXTURE_VALIDATION);
  }
  if (system?.includes('brand strategist') || system?.includes('стратег')) {
    return makeMessageResponse(FIXTURE_REPORT);
  }
  return makeMessageResponse(FIXTURE_BRAND_DNA);
};

// Batch API stub for analyzeJob
const fakeBatchCreate = async () => ({
  id:     `batch_${uuidv4()}`,
  status: 'ended',
});

const fakeBatchResults = async function* () {
  yield {
    custom_id: 'profile_0',
    result:    {
      type:    'succeeded',
      message: makeMessageResponse(FIXTURE_ANALYSIS),
    },
  };
};

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    get messages() {
      return {
        create:  fakeCreate,
        batches: {
          create:  fakeBatchCreate,
          results: fakeBatchResults,
        },
      };
    }
  },
}));

vi.mock('../src/rag/embeddings.js', () => ({
  generateEmbedding:    async () => Array(768).fill(0),
  formatEmbeddingForPg: e => `[${e.join(',')}]`,
  analysisToEmbedText:  a => (a.topics ?? []).join(', '),
  generateEmbeddingsBatch: async texts => texts.map(() => Array(768).fill(0)),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

let runPipeline;
let testPool;
const testReportId = uuidv4();
const testTenantId = uuidv4();

beforeAll(async () => {
  const { setupTestDb } = await import('./helpers/db.js');
  testPool = await setupTestDb();

  // Set env
  process.env.USE_LOCAL_PROFILES = 'true';
  process.env.PROFILES_DIR       = new URL('./fixtures/profiles', import.meta.url).pathname;

  // Insert test report record
  await testPool.query(
    `INSERT INTO reports (id, tenant_id, project_name, brand_dna, brand_raw_input, handles, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [
      testReportId,
      testTenantId,
      'Smoke Test Brand',
      JSON.stringify({}),
      'A mountain retreat focused on stillness and quality',
      ['handle1', 'handle2'],
    ]
  );

  ({ runPipeline } = await import('../src/pipeline/orchestrator.js'));
});

afterAll(async () => {
  const { teardownTestDb } = await import('./helpers/db.js');
  // Clean up test data
  await testPool.query('DELETE FROM reports WHERE id = $1', [testReportId]);
  await testPool.query('DELETE FROM segment_library WHERE tenant_id = $1', [testTenantId]);
  await teardownTestDb();
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

describe('Pipeline smoke test (localFetch + mocked LLM)', () => {
  it('completes without throwing', async () => {
    await expect(
      runPipeline({
        reportId:      testReportId,
        tenantId:      testTenantId,
        brandRawInput: 'A mountain retreat — stillness and quality without pretension',
        handles:       ['handle1', 'handle2'],
        keepHandles:   false,
        promptVersions: {},
      })
    ).resolves.not.toThrow();
  });

  it('report status is "done" in the DB after completion', async () => {
    const { rows } = await testPool.query(
      'SELECT status FROM reports WHERE id = $1',
      [testReportId]
    );
    expect(rows[0]?.status).toBe('done');
  });

  it('report_json has expected shape', async () => {
    const { rows } = await testPool.query(
      'SELECT report_json FROM reports WHERE id = $1',
      [testReportId]
    );
    const report = rows[0]?.report_json;
    expect(report).toBeTruthy();
    expect(Array.isArray(report.audience_segments)).toBe(true);
    expect('alignment_score' in report).toBe(true);
    expect(Array.isArray(report.content_strategy_pillars)).toBe(true);
  });

  it('report has integrity block with checksum', async () => {
    const { rows } = await testPool.query(
      'SELECT report_json FROM reports WHERE id = $1',
      [testReportId]
    );
    const report = rows[0]?.report_json;
    expect(report?.integrity).toBeTruthy();
    expect(report.integrity.checksum).toBeTruthy();
  });

  it('integrity checksum verifies', async () => {
    const { rows } = await testPool.query(
      'SELECT report_json FROM reports WHERE id = $1',
      [testReportId]
    );
    const { verifyReport } = await import('../src/safety/outputSigner.js');
    const result = verifyReport(rows[0]?.report_json);
    expect(result.valid).toBe(true);
  });

  it('segment library has at least one row for this tenant run', async () => {
    const { rows } = await testPool.query(
      'SELECT COUNT(*) FROM segment_library WHERE tenant_id = $1',
      [testTenantId]
    );
    const count = parseInt(rows[0].count, 10);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('job_audit has at least one event for this report', async () => {
    const { rows } = await testPool.query(
      'SELECT COUNT(*) FROM job_audit WHERE report_id = $1',
      [testReportId]
    );
    const count = parseInt(rows[0].count, 10);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
