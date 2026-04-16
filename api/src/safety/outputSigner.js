/**
 * outputSigner.js
 *
 * Signs reports with a tamper-evident checksum and metadata snapshot.
 *
 * Purpose:
 *   - Client disputes: "why did this report change?" → compare checksums
 *   - Audit trail: which model + prompt version produced this output
 *   - Anti-tampering: detect if report_json was modified after generation
 *   - Reproducibility: re-run at the exact same model/prompt versions
 *
 * The checksum covers the core analytical payload (segments, pillars, alignment).
 * It does NOT cover the integrity block itself (would be circular).
 */

import crypto from 'crypto';

// ─── Sign ─────────────────────────────────────────────────────────────────────

/**
 * Attaches an integrity block to a completed report.
 *
 * @param {object} report
 * @param {object} meta
 * @param {object} meta.modelVersions    - { analysis: 'claude-sonnet-4-6', aggregation: '...' }
 * @param {object} meta.promptVersions   - { analysis: 'v2.0', aggregation: 'v2.0' }
 * @param {number} meta.handleCount      - Number of profiles analyzed
 * @returns {object} report with integrity block attached
 */
export function signReport(report, { modelVersions, promptVersions, handleCount }) {
  const payload = stableSerialize({
    audience_segments:        report.audience_segments,
    content_strategy_pillars: report.content_strategy_pillars,
    alignment_score:          report.alignment_score,
  });

  const checksum = crypto.createHash('sha256').update(payload).digest('hex');

  return {
    ...report,
    integrity: {
      schema_version:  '2.0',
      generated_at:    new Date().toISOString(),
      model_versions:  modelVersions,
      prompt_versions: promptVersions,
      handle_count:    handleCount,
      checksum,
    },
  };
}

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * Verifies a signed report's integrity.
 *
 * @param {object} report - Report with integrity block
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyReport(report) {
  if (!report?.integrity?.checksum) {
    return { valid: false, reason: 'Missing integrity block — report was not signed' };
  }

  const payload = stableSerialize({
    audience_segments:        report.audience_segments,
    content_strategy_pillars: report.content_strategy_pillars,
    alignment_score:          report.alignment_score,
  });

  const expected = crypto.createHash('sha256').update(payload).digest('hex');

  if (expected !== report.integrity.checksum) {
    return {
      valid:  false,
      reason: 'Checksum mismatch — report content was modified after signing',
    };
  }

  return { valid: true };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic JSON serialization.
 * JSON.stringify key order is engine-dependent — sort keys for a stable hash.
 */
function stableSerialize(obj) {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(obj) {
  if (Array.isArray(obj))                        return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => {
      acc[k] = sortKeys(obj[k]);
      return acc;
    }, {});
  }
  return obj;
}