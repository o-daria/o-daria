/**
 * validateJob.js — Pipeline Validation Gate
 *
 * Haiku-powered semantic QA that catches issues JSON schema validation misses.
 * Runs after both analyzeJob (per-profile validation) and aggregateJob (report validation).
 *
 * Two modes:
 *   'profile'  — validates a single profile analysis
 *   'report'   — validates the full aggregated audience report
 *
 * On critical issues: throws ValidationError → orchestrator routes to
 * a ClarificationAgent (re-runs the failed step with enriched context).
 * On warnings: returns issues array alongside result for logging.
 */

import Anthropic           from '@anthropic-ai/sdk';
import { getPrompt }       from '../../prompts/registry.js';

const client = new Anthropic();

export class ValidationError extends Error {
  constructor(message, issues) {
    super(message);
    this.name   = 'ValidationError';
    this.issues = issues;
  }
}

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Validates an analysis or report object.
 *
 * @param {object} data      - Profile analysis or audience report
 * @param {string} mode      - 'profile' | 'report'
 * @param {object} context   - { brandDna } — needed for semantic checks
 * @returns {Promise<{ valid: boolean, issues: object[] }>}
 */
export async function runValidation(data, mode = 'report', context = {}) {
  const { content: systemPrompt } = await getPrompt('validation', 'latest');

  const userContent = buildValidationPrompt(data, mode, context);

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0].text.trim();
  let result;

  try {
    result = JSON.parse(raw);
  } catch {
    result = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }

  const criticalIssues = (result.issues ?? []).filter(i => i.severity === 'critical');

  if (criticalIssues.length > 0) {
    console.warn(`[Validation] ${criticalIssues.length} critical issue(s) in ${mode}:`);
    criticalIssues.forEach(i => console.warn(`  • [${i.field}] ${i.issue}`));
    throw new ValidationError(
      `Validation failed (${mode}): ${criticalIssues.length} critical issue(s)`,
      result.issues
    );
  }

  const warnings = (result.issues ?? []).filter(i => i.severity === 'warning');
  if (warnings.length > 0) {
    console.warn(`[Validation] ${warnings.length} warning(s) in ${mode}:`);
    warnings.forEach(i => console.warn(`  ⚠ [${i.field}] ${i.issue}`));
  }

  return result;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildValidationPrompt(data, mode, context) {
  const brandContext = context.brandDna
    ? `Brand values: ${JSON.stringify(context.brandDna, null, 2)}\n\n`
    : '';

  const modeInstruction = mode === 'profile'
    ? `Validate this PROFILE ANALYSIS for the issues listed in your instructions.
       Pay special attention to:
       - content_mix values summing to 1.0
       - confidence_note not making claims beyond what is directly observed`
    : `Validate this AUDIENCE REPORT for the issues listed in your instructions.
       Pay special attention to:
       - alignment_score.overall being consistent with rationale text
       - segment brand_fit labels being justified by defining_traits
       - best_photos_for_persona_slide handles existing in audience_segments`;

  return `${brandContext}${modeInstruction}

Data to validate:
${JSON.stringify(data, null, 2)}`;
}
