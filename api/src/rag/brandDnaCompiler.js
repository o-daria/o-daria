/**
 * brandDnaCompiler.js
 *
 * Converts raw user brand input into a structured, typed brand DNA object.
 *
 * Problem this solves:
 *   Users type things like "we're a cozy mountain glamping spot, premium but not
 *   pretentious, we care about real rest". This is too ambiguous for stable
 *   downstream prompt behavior — two paraphrases of the same brief produce
 *   inconsistent analysis outputs.
 *
 * Solution:
 *   Run a cheap Haiku compilation step: free text → structured JSON.
 *   Downstream prompts receive stable, typed brand DNA regardless of user phrasing.
 *   Also enables brand DNA versioning: change the brief → new compiled object
 *   → new report, with a clear diff.
 */

import Anthropic             from '@anthropic-ai/sdk';
import { getPrompt }         from '../prompts/registry.js';
import { sanitizeBrandInput } from '../safety/inputSanitizer.js';

const client = new Anthropic();

// ─── Compile ─────────────────────────────────────────────────────────────────

/**
 * Compiles raw brand description text into a structured brand DNA object.
 *
 * @param {string} rawBrandInput - Free-text brand description from the user form
 * @returns {Promise<object>}    - Structured brand DNA
 */
export async function compileBrandDna(rawBrandInput) {
  const sanitized = sanitizeBrandInput(rawBrandInput);

  const { content: systemPrompt } = await getPrompt('brand_dna', 'latest');

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: `Brand description: "${sanitized}"\n\nReturn structured JSON.` }],
  });

  const raw = response.content[0].text.trim();

  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
  }
}

// ─── Format for prompts ───────────────────────────────────────────────────────

/**
 * Formats a compiled brand DNA object into a human-readable string for prompt injection.
 * Accepts either a compiled object (preferred) or a raw string (backward compat).
 *
 * @param {object|string} dna
 * @returns {string}
 */
export function formatBrandDnaForPrompt(dna) {
  if (typeof dna === 'string') return dna;
  if (!dna || typeof dna !== 'object') return '';

  const lines = [];
  if (dna.tone)                  lines.push(`Тон: ${dna.tone}`);
  if (dna.values?.length)        lines.push(`Цінності: ${dna.values.join(', ')}`);
  if (dna.visual_vocabulary?.length) lines.push(`Візуальна мова: ${dna.visual_vocabulary.join(', ')}`);
  if (dna.anti_values?.length)   lines.push(`Антицінності (чим НЕ є): ${dna.anti_values.join(', ')}`);
  if (dna.positioning_tension)   lines.push(`Позиційна напруга: ${dna.positioning_tension}`);
  if (dna.audience_aspiration)   lines.push(`Аспірація аудиторії: ${dna.audience_aspiration}`);
  if (dna.key_differentiator)    lines.push(`Ключовий диференціатор: ${dna.key_differentiator}`);

  return lines.join('\n');
}