import { describe, it, expect } from 'vitest';
import { signReport, verifyReport } from './outputSigner.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleReport = {
  audience_segments: [
    {
      label: 'Eco-Conscious Millennials',
      size_estimate: '40%',
      brand_fit: 'high',
      representative_handles: ['user1', 'user2'],
    },
  ],
  content_strategy_pillars: ['sustainability', 'authenticity'],
  alignment_score: 0.82,
};

const sampleMeta = {
  modelVersions:  { analysis: 'claude-sonnet-4-6', aggregation: 'claude-haiku-4-5-20251001' },
  promptVersions: { analysis: 'v2.0', aggregation: 'v2.0' },
  handleCount:    5,
};

// ─── signReport ───────────────────────────────────────────────────────────────

describe('signReport', () => {
  it('attaches an integrity block to the report', () => {
    const signed = signReport(sampleReport, sampleMeta);
    expect(signed.integrity).toBeTruthy();
  });

  it('integrity block has all required fields', () => {
    const signed = signReport(sampleReport, sampleMeta);
    const { integrity } = signed;
    expect(integrity.schema_version).toBeTruthy();
    expect(integrity.generated_at).toBeTruthy();
    expect(integrity.model_versions).toBeTruthy();
    expect(integrity.prompt_versions).toBeTruthy();
    expect(integrity.handle_count).toBe(5);
    expect(integrity.checksum).toBeTruthy();
  });

  it('schema_version is "2.0"', () => {
    const signed = signReport(sampleReport, sampleMeta);
    expect(signed.integrity.schema_version).toBe('2.0');
  });

  it('checksum is a 64-char hex string (sha256)', () => {
    const signed = signReport(sampleReport, sampleMeta);
    expect(signed.integrity.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same checksum for identical reports (deterministic)', () => {
    const signed1 = signReport(sampleReport, sampleMeta);
    const signed2 = signReport(sampleReport, sampleMeta);
    expect(signed1.integrity.checksum).toBe(signed2.integrity.checksum);
  });

  it('produces different checksums for different payloads', () => {
    const signed1 = signReport(sampleReport, sampleMeta);
    const modified = { ...sampleReport, alignment_score: 0.5 };
    const signed2  = signReport(modified, sampleMeta);
    expect(signed1.integrity.checksum).not.toBe(signed2.integrity.checksum);
  });

  it('preserves original report fields', () => {
    const signed = signReport(sampleReport, sampleMeta);
    expect(signed.audience_segments).toEqual(sampleReport.audience_segments);
    expect(signed.content_strategy_pillars).toEqual(sampleReport.content_strategy_pillars);
    expect(signed.alignment_score).toBe(sampleReport.alignment_score);
  });

  it('checksum is stable regardless of key insertion order', () => {
    const r1 = { alignment_score: 0.82, audience_segments: [], content_strategy_pillars: [] };
    const r2 = { content_strategy_pillars: [], audience_segments: [], alignment_score: 0.82 };
    const s1 = signReport(r1, sampleMeta);
    const s2 = signReport(r2, sampleMeta);
    expect(s1.integrity.checksum).toBe(s2.integrity.checksum);
  });
});

// ─── verifyReport ─────────────────────────────────────────────────────────────

describe('verifyReport', () => {
  it('returns { valid: true } for a correctly signed report', () => {
    const signed = signReport(sampleReport, sampleMeta);
    const result = verifyReport(signed);
    expect(result).toEqual({ valid: true });
  });

  it('returns { valid: false } when integrity block is absent', () => {
    const result = verifyReport(sampleReport); // unsigned
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('returns { valid: false } when checksum field is missing', () => {
    const signed = signReport(sampleReport, sampleMeta);
    delete signed.integrity.checksum;
    const result = verifyReport(signed);
    expect(result.valid).toBe(false);
  });

  it('returns { valid: false } after tampering with alignment_score', () => {
    const signed = signReport(sampleReport, sampleMeta);
    signed.alignment_score = 0.99; // tamper
    const result = verifyReport(signed);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it('returns { valid: false } after tampering with audience_segments', () => {
    const signed = signReport(sampleReport, sampleMeta);
    signed.audience_segments.push({ label: 'Injected Segment' });
    const result = verifyReport(signed);
    expect(result.valid).toBe(false);
  });

  it('returns { valid: false } after tampering with content_strategy_pillars', () => {
    const signed = signReport(sampleReport, sampleMeta);
    signed.content_strategy_pillars.push('fake pillar');
    const result = verifyReport(signed);
    expect(result.valid).toBe(false);
  });

  it('handles null report gracefully', () => {
    const result = verifyReport(null);
    expect(result.valid).toBe(false);
  });
});
