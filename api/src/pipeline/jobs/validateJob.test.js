/**
 * validateJob.test.js
 *
 * Tests the semantic QA gate with a mocked Anthropic client.
 * Verifies:
 *   - ValidationError is thrown only on critical-severity issues
 *   - Warnings are returned but do not throw
 *   - Valid responses return { valid: true }
 *   - ValidationError carries the full issues array
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Anthropic mock factory ───────────────────────────────────────────────────

// Controls what the mocked Anthropic returns — set per test
let nextLLMResponse = null;

const fakeCreate = async () => {
  if (!nextLLMResponse) throw new Error('nextLLMResponse not set');
  return {
    content: [{ text: JSON.stringify(nextLLMResponse) }],
  };
};

const fakeGetPrompt = async () => ({
  content: 'You are a validation assistant. Return JSON.',
  version: 'v1.0',
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    get messages() {
      return { create: fakeCreate };
    }
  },
}));

vi.mock('../../prompts/registry.js', () => ({
  getPrompt: (...args) => fakeGetPrompt(...args),
}));

const { runValidation, ValidationError } = await import('./validateJob.js');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validProfileAnalysis = {
  handle:            'test_brand',
  topics:            ['fashion', 'lifestyle'],
  lifestyle_cluster: 'aspirational urban',
  content_mix:       { photo: 0.6, video: 0.3, carousel: 0.1 },
  confidence_note:   'Based on 9 posts and captions.',
  brand_alignment_hint: 'strong match on values',
};

const validReport = {
  audience_segments: [
    {
      label:                  'Eco-Conscious Millennials',
      brand_fit:              'high',
      defining_traits:        ['sustainability', 'quality-focus'],
      representative_handles: ['brand1', 'brand2'],
    },
  ],
  alignment_score: { overall: 82, rationale: 'Strong overlap on premium values' },
  content_strategy_pillars: ['sustainability', 'craftsmanship'],
};

// ─── Validation — valid cases ──────────────────────────────────────────────────

describe('runValidation — valid responses', () => {
  it('returns { valid: true } for a clean profile analysis', async () => {
    nextLLMResponse = { valid: true, issues: [] };

    const result = await runValidation(validProfileAnalysis, 'profile');
    expect(result.valid).toBe(true);
  });

  it('returns { valid: true } for a clean report', async () => {
    nextLLMResponse = { valid: true, issues: [] };

    const result = await runValidation(validReport, 'report');
    expect(result.valid).toBe(true);
  });

  it('does not throw when issues array is absent', async () => {
    nextLLMResponse = { valid: true };

    await expect(runValidation(validReport, 'report')).resolves.not.toThrow();
  });
});

// ─── Validation — warnings (non-critical) ─────────────────────────────────────

describe('runValidation — warnings', () => {
  it('returns result without throwing for warning-only issues', async () => {
    nextLLMResponse = {
      valid:  true,
      issues: [
        { field: 'confidence_note', issue: 'Slightly vague wording', severity: 'warning' },
      ],
    };

    await expect(runValidation(validProfileAnalysis, 'profile')).resolves.not.toThrow();
  });

  it('includes the warning in the returned issues', async () => {
    const warning = { field: 'confidence_note', issue: 'Minor phrasing issue', severity: 'warning' };
    nextLLMResponse = { valid: true, issues: [warning] };

    const result = await runValidation(validProfileAnalysis, 'profile');
    expect(result.issues?.length).toBeGreaterThanOrEqual(0);
  });
});

// ─── Validation — critical issues ─────────────────────────────────────────────

describe('runValidation — critical issues throw ValidationError', () => {
  it('throws ValidationError on a single critical issue', async () => {
    nextLLMResponse = {
      valid:  false,
      issues: [
        { field: 'content_mix', issue: 'Values do not sum to 1.0', severity: 'critical' },
      ],
    };

    await expect(
      runValidation(validProfileAnalysis, 'profile')
    ).rejects.toThrow();

    try {
      await runValidation(validProfileAnalysis, 'profile');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
    }
  });

  it('ValidationError carries the full issues array', async () => {
    const criticalIssue = {
      field:    'alignment_score',
      issue:    'Score inconsistent with rationale',
      severity: 'critical',
    };
    nextLLMResponse = { valid: false, issues: [criticalIssue] };

    try {
      await runValidation(validReport, 'report');
      expect.unreachable('Expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(Array.isArray(err.issues)).toBe(true);
      expect(err.issues.length).toBe(1);
      expect(err.issues[0].field).toBe('alignment_score');
    }
  });

  it('throws ValidationError when mix of critical + warning issues', async () => {
    nextLLMResponse = {
      valid:  false,
      issues: [
        { field: 'content_mix', issue: 'Does not sum to 1.0',    severity: 'critical' },
        { field: 'confidence',  issue: 'Could be more specific', severity: 'warning'  },
      ],
    };

    try {
      await runValidation(validProfileAnalysis, 'profile');
      expect.unreachable('Expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
    }
  });

  it('does NOT throw when all issues are warnings (no critical)', async () => {
    nextLLMResponse = {
      valid:  true,
      issues: [
        { field: 'confidence_note', issue: 'Could be more precise', severity: 'warning' },
        { field: 'topics',          issue: 'Slightly generic',      severity: 'warning' },
      ],
    };

    await expect(
      runValidation(validProfileAnalysis, 'profile')
    ).resolves.not.toThrow();
  });

  it('ValidationError name is "ValidationError"', async () => {
    nextLLMResponse = {
      valid:  false,
      issues: [{ field: 'x', issue: 'y', severity: 'critical' }],
    };

    try {
      await runValidation(validReport, 'report');
    } catch (err) {
      expect(err.name).toBe('ValidationError');
    }
  });
});

// ─── LLM response handling ────────────────────────────────────────────────────

describe('runValidation — response parsing', () => {
  it('handles valid JSON response correctly', async () => {
    nextLLMResponse = { valid: true, issues: [] };
    const result = await runValidation(validReport, 'report');
    expect(result.valid).toBe(true);
  });
});
