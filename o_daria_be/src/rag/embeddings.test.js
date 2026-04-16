/**
 * embeddings.test.js
 *
 * Unit tests for the pure helper functions in embeddings.js.
 * Tests analysisToEmbedText() and formatEmbeddingForPg() — no IO required.
 *
 * generateEmbedding() and generateEmbeddingsBatch() make HTTP calls to
 * Ollama/OpenAI and are NOT tested here (tested implicitly by integration tests).
 */

import { describe, it, expect } from 'vitest';
import { analysisToEmbedText, formatEmbeddingForPg } from './embeddings.js';

// ─── analysisToEmbedText ──────────────────────────────────────────────────────

describe('analysisToEmbedText', () => {
  it('returns a non-empty string for a complete analysis', () => {
    const analysis = {
      topics:            ['fashion', 'lifestyle', 'sustainability'],
      lifestyle_cluster: 'aspirational urban',
      brand_alignment_hint: 'strong match on premium values',
      observed_signals: {
        visual_tone:          'warm and moody',
        caption_register:     'conversational',
        self_disclosure_level: 'moderate',
        environment:          ['outdoor', 'urban'],
        community_signals:    ['sustainability', 'craft'],
        photo_types:          ['portrait', 'product'],
        objects:              ['coffee', 'books'],
      },
    };

    const result = analysisToEmbedText(analysis);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes topics in the output', () => {
    const result = analysisToEmbedText({
      topics: ['fashion', 'travel'],
    });
    expect(result).toMatch(/fashion/);
    expect(result).toMatch(/travel/);
  });

  it('includes lifestyle_cluster in the output', () => {
    const result = analysisToEmbedText({
      lifestyle_cluster: 'minimalist professional',
    });
    expect(result).toMatch(/minimalist professional/);
  });

  it('includes brand_alignment_hint in the output', () => {
    const result = analysisToEmbedText({
      brand_alignment_hint: 'strong match on values',
    });
    expect(result).toMatch(/strong match on values/);
  });

  it('includes observed_signals.visual_tone', () => {
    const result = analysisToEmbedText({
      observed_signals: { visual_tone: 'bright and clean' },
    });
    expect(result).toMatch(/bright and clean/);
  });

  it('handles missing fields gracefully (no throw)', () => {
    expect(() => analysisToEmbedText({})).not.toThrow();
    expect(() => analysisToEmbedText({ topics: undefined })).not.toThrow();
    expect(() => analysisToEmbedText({ observed_signals: {} })).not.toThrow();
  });

  it('returns empty or minimal string for empty analysis', () => {
    const result = analysisToEmbedText({});
    expect(typeof result).toBe('string');
  });

  it('filters out null/undefined parts (no leading dots or double dots)', () => {
    const result = analysisToEmbedText({ topics: ['art'] });
    expect(result).not.toMatch(/^\./);
    expect(result).not.toMatch(/\.\s*\./);
  });
});

// ─── formatEmbeddingForPg ─────────────────────────────────────────────────────

describe('formatEmbeddingForPg', () => {
  it('wraps embedding in square brackets', () => {
    const result = formatEmbeddingForPg([0.1, 0.2, 0.3]);
    expect(result).toMatch(/^\[/);
    expect(result).toMatch(/\]$/);
  });

  it('produces a pgvector-compatible string format', () => {
    const result = formatEmbeddingForPg([0.1, 0.5, 0.9]);
    expect(result).toBe('[0.1,0.5,0.9]');
  });

  it('handles a 768-dim zero vector', () => {
    const zeros  = Array(768).fill(0);
    const result = formatEmbeddingForPg(zeros);
    expect(result).toMatch(/^\[0,0,0,/);
    expect(result.split(',').length).toBe(768);
  });

  it('handles a 1536-dim vector (OpenAI)', () => {
    const vec    = Array(1536).fill(0.001);
    const result = formatEmbeddingForPg(vec);
    expect(result.split(',').length).toBe(1536);
  });

  it('handles a single-element vector', () => {
    expect(formatEmbeddingForPg([0.5])).toBe('[0.5]');
  });
});
