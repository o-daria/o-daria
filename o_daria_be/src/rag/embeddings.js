/**
 * embeddings.js
 *
 * Thin wrapper for generating text embeddings.
 *
 * Default: Ollama with nomic-embed-text (768 dimensions, free, local)
 * Fallback: OpenAI text-embedding-3-small (1536 dimensions) if OPENAI_API_KEY is set
 *
 * Configuration via environment variables:
 *   EMBEDDING_PROVIDER  — 'ollama' (default) or 'openai'
 *   EMBEDDING_MODEL     — model name (default: nomic-embed-text / text-embedding-3-small)
 *   EMBEDDING_BASE_URL  — Ollama endpoint (default: http://localhost:11434/v1)
 *   OPENAI_API_KEY      — required only when EMBEDDING_PROVIDER=openai
 *
 * NOTE: Ollama and OpenAI produce different dimension sizes (768 vs 1536).
 * The pgvector schema must match. See schema.sql vector() column definitions.
 */

import OpenAI from 'openai';

const PROVIDER = process.env.EMBEDDING_PROVIDER
  ?? (process.env.OPENAI_API_KEY ? 'openai' : 'ollama');

const DEFAULTS = {
  ollama: {
    baseURL: process.env.EMBEDDING_BASE_URL ?? 'http://localhost:11434/v1',
    apiKey:  'ollama',   // Ollama ignores this but the SDK requires a non-empty string
    model:   process.env.EMBEDDING_MODEL ?? 'nomic-embed-text',
  },
  openai: {
    baseURL: undefined,  // use OpenAI default
    apiKey:  process.env.OPENAI_API_KEY,
    model:   process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
  },
};

const config = DEFAULTS[PROVIDER] ?? DEFAULTS.ollama;

const openai = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

const MODEL           = config.model;
const MAX_INPUT_CHARS = 2000;   // Safe ceiling for nomic-embed-text's 2048-token context.
                                // Original 4000 assumed ~4 chars/token (English). Ukrainian
                                // Cyrillic tokenizes at ~1.5–2 chars/token, so 4000 chars
                                // could produce 2000–2666 tokens — exceeding the model limit.

console.log(`[Embeddings] provider=${PROVIDER}, model=${MODEL}`);

// ─── Single embedding ────────────────────────────────────────────────────────

/**
 * Generates an embedding vector for a single text string.
 *
 * @param {string} text
 * @returns {Promise<number[]>} 1536-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  const truncated = String(text).slice(0, MAX_INPUT_CHARS);

  const res = await openai.embeddings.create({
    model: MODEL,
    input: truncated,
  });

  return res.data[0].embedding;
}

// ─── Batch embeddings ────────────────────────────────────────────────────────

/**
 * Generates embeddings for multiple texts in a single API call.
 * More efficient than calling generateEmbedding() in a loop.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of embedding vectors (same order as input)
 */
export async function generateEmbeddingsBatch(texts) {
  const truncated = texts.map(t => String(t).slice(0, MAX_INPUT_CHARS));

  const res = await openai.embeddings.create({
    model: MODEL,
    input: truncated,
  });

  return res.data.map(d => d.embedding);
}

// ─── Analysis → embed text ───────────────────────────────────────────────────

/**
 * Converts a parsed profile analysis object into a flat text string
 * suitable for embedding and semantic similarity search.
 *
 * Prioritizes the fields that carry the most semantic signal:
 * topics, lifestyle cluster, observed signals, and brand alignment hint.
 *
 * @param {object} analysis  - Parsed analysis JSON produced by the analysis prompt
 * @returns {string}
 */
export function analysisToEmbedText(analysis) {
  const sig = analysis.observed_signals ?? {};

  const parts = [
    analysis.topics?.join(', '),
    analysis.lifestyle_cluster,
    analysis.brand_alignment_hint,
    sig.visual_tone,
    sig.caption_register,
    sig.self_disclosure_level,
    sig.environment?.join(', '),
    sig.community_signals?.join(', '),
    sig.photo_types?.join(', '),
    sig.objects?.join(', '),
  ];

  return parts.filter(Boolean).join('. ');
}

// ─── pgvector format ─────────────────────────────────────────────────────────

/**
 * Formats an embedding vector for pgvector insertion.
 * pgvector expects '[0.1,0.2,...]' string, not a JSON array.
 *
 * @param {number[]} embedding
 * @returns {string}
 */
export function formatEmbeddingForPg(embedding) {
  return `[${embedding.join(',')}]`;
}
