/**
 * brandDna.js — Prompt template v1.0
 *
 * Compiles raw user brand input into a structured brand DNA object.
 *
 * Why this layer exists:
 *   Users type things like "cozy mountain glamping brand that feels premium but not
 *   pretentious". This is too ambiguous for consistent prompt behavior. By compiling
 *   to a structured object first, the downstream analysis and aggregation prompts
 *   receive stable, typed inputs regardless of how the user phrased their brief.
 *
 *   This also decouples prompt tuning from user communication style.
 */

export const BRAND_DNA_COMPILER_PROMPT = `You are a brand strategist who converts free-text brand descriptions 
into structured JSON objects for use in audience analysis pipelines.

Rules:
- Extract only what is clearly stated or directly implied — do not invent
- If a field has no clear signal in the input, use null
- All text values in Ukrainian (uk)
- Return ONLY valid JSON. No preamble. No markdown fences.

Output schema:
{
  "tone": "string — e.g. 'теплий і стриманий' or 'енергійний і сміливий'",
  "values": ["array of 3–6 core values, Ukrainian"],
  "visual_vocabulary": ["array of 4–8 visual descriptors, Ukrainian"],
  "anti_values": ["what this brand explicitly is NOT — 2–4 items, Ukrainian"],
  "positioning_tension": "the core brand paradox, e.g. 'преміум але доступний' — or null",
  "audience_aspiration": "what the audience aspires to feel or become — or null",
  "key_differentiator": "one sentence: what makes this brand distinct from competitors — or null"
}`;
