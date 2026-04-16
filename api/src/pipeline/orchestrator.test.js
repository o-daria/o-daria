/**
 * orchestrator.test.js
 *
 * Tests the pipeline orchestration logic with all external jobs mocked.
 * Specifically tests:
 *   - Handle validation (invalid handles skipped, all-invalid throws)
 *   - ValidationError triggers exactly one clarification retry
 *   - Non-ValidationError propagates immediately (no retry)
 *   - DB status updates: 'running' on start, 'failed' on error
 *   - Audit trail is recorded on failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock infrastructure ──────────────────────────────────────────────────────

// ValidationError must be a real class so instanceof checks work
class MockValidationError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name   = 'ValidationError';
    this.issues = issues;
  }
}

const dbQueries = [];
const fakeQuery = async (text, values) => {
  dbQueries.push({ text, values });
  return { rows: [] };
};

const auditedJobs = [];
const fakeAuditJob = async (reportId, jobName, status, payload) => {
  auditedJobs.push({ reportId, jobName, status, payload });
};

// Mutable stubs — tests reset these before each scenario
let analyzeStub;
let aggregateStub;

const fakeCompileBrandDna = async () => ({
  tone: 'calm', values: ['quality'], key_differentiator: 'mountain retreat',
});
const fakeFetchProfiles = async () => [
  { handle: 'profile1', captions: [], imagePaths: {} },
];

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../db/client.js', () => ({
  query: (...args) => fakeQuery(...args),
}));

vi.mock('../safety/inputSanitizer.js', () => ({
  validateHandle:   h => h.replace(/^@/, '').toLowerCase(),
  sanitizeCaption:  c => c,
  sanitizeBrandInput: i => i,
  INJECTION_GUARD:  '',
}));

vi.mock('../rag/brandDnaCompiler.js', () => ({
  compileBrandDna: (...args) => fakeCompileBrandDna(...args),
}));

vi.mock('./jobs/fetchJob.js', () => ({
  fetchProfiles: (...args) => fakeFetchProfiles(...args),
}));

vi.mock('./jobs/auditTrail.js', () => ({
  auditJob: (...args) => fakeAuditJob(...args),
}));

vi.mock('./jobs/validateJob.js', () => ({
  ValidationError: MockValidationError,
  runValidation:   async () => ({ valid: true }),
}));

vi.mock('./jobs/analyzeJob.js', () => ({
  runAnalyzeJob: async (params) => {
    if (analyzeStub) return analyzeStub(params);
    return [{ handle: 'profile1' }];
  },
}));

vi.mock('./jobs/aggregateJob.js', () => ({
  runAggregateJob: async (params) => {
    if (aggregateStub) return aggregateStub(params);
    return {
      audience_segments:        [{ label: 'Eco Shoppers' }],
      content_strategy_pillars: ['sustainability'],
      alignment_score:          0.8,
      integrity:                { checksum: 'abc' },
    };
  },
}));

const { runPipeline } = await import('./orchestrator.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetState() {
  dbQueries.length    = 0;
  auditedJobs.length  = 0;
  analyzeStub         = null;
  aggregateStub       = null;
}

const BASE_PARAMS = {
  reportId:      'report-001',
  tenantId:      'tenant-a',
  brandRawInput: 'A premium mountain retreat brand',
  handles:       ['brand1', 'brand2'],
  keepHandles:   false,
  promptVersions: {},
};

// ─── Status updates ───────────────────────────────────────────────────────────

describe('runPipeline — status updates', () => {
  beforeEach(resetState);

  it('sets status to "running" at the start of the pipeline', async () => {
    await runPipeline(BASE_PARAMS);

    const runningUpdate = dbQueries.find(
      q => /UPDATE reports SET status/i.test(q.text) && q.values.includes('running')
    );
    expect(runningUpdate).toBeTruthy();
  });

  it('sets status to "failed" when a job throws a non-ValidationError', async () => {
    analyzeStub = async () => { throw new Error('Unexpected LLM failure'); };

    await expect(runPipeline(BASE_PARAMS)).rejects.toThrow(/Unexpected LLM failure/);

    const failedUpdate = dbQueries.find(
      q => /UPDATE reports SET status/i.test(q.text) && q.values.includes('failed')
    );
    expect(failedUpdate).toBeTruthy();
  });

  it('records a failure audit event when the pipeline fails', async () => {
    aggregateStub = async () => { throw new Error('DB write error'); };

    await expect(runPipeline(BASE_PARAMS)).rejects.toThrow();

    const failedAudit = auditedJobs.find(j => j.status === 'failed');
    expect(failedAudit).toBeTruthy();
  });
});

// ─── Handle validation ────────────────────────────────────────────────────────

describe('runPipeline — handle validation', () => {
  beforeEach(resetState);

  it('throws when no valid handles remain after filtering', async () => {
    await expect(
      runPipeline({ ...BASE_PARAMS, handles: [] })
    ).rejects.toThrow(/No valid Instagram handles/);
  });
});

// ─── ValidationError retry logic ─────────────────────────────────────────────

describe('runPipeline — ValidationError retry', () => {
  beforeEach(resetState);

  it('retries once on ValidationError from analyzeJob', async () => {
    let callCount = 0;

    analyzeStub = async () => {
      callCount++;
      if (callCount === 1) {
        throw new MockValidationError('failed validation', [
          { field: 'content_mix', issue: 'does not sum to 1.0', severity: 'critical' },
        ]);
      }
      return [{ handle: 'profile1' }]; // success on retry
    };

    await runPipeline(BASE_PARAMS); // should NOT throw

    expect(callCount).toBe(2);
  });

  it('records clarification audit events on retry', async () => {
    let callCount = 0;

    analyzeStub = async () => {
      callCount++;
      if (callCount === 1) {
        throw new MockValidationError('failed', [
          { field: 'x', issue: 'y', severity: 'critical' },
        ]);
      }
      return [{ handle: 'profile1' }];
    };

    await runPipeline(BASE_PARAMS);

    const clarificationEvents = auditedJobs.filter(j =>
      j.jobName.includes('clarification')
    );
    expect(clarificationEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('propagates ValidationError if retry also fails', async () => {
    analyzeStub = async () => {
      throw new MockValidationError('always fails', [
        { field: 'x', issue: 'y', severity: 'critical' },
      ]);
    };

    await expect(runPipeline(BASE_PARAMS)).rejects.toSatisfy(
      err => err.name === 'ValidationError' || err.message.includes('fails')
    );
  });

  it('does NOT retry on a non-ValidationError', async () => {
    let callCount = 0;

    analyzeStub = async () => {
      callCount++;
      throw new Error('Network timeout — not a validation issue');
    };

    await expect(runPipeline(BASE_PARAMS)).rejects.toThrow(/Network timeout/);

    expect(callCount).toBe(1);
  });
});
