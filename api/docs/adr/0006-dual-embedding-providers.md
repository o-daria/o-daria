# ADR-0006: Dual Embedding Provider Support

**Date:** 2025-01  
**Status:** Accepted  
**Category:** RAG

## Context

The RAG system requires text embeddings for profile similarity search and segment library retrieval. Embedding provider choice affects cost, latency, quality, and infrastructure requirements.

### Alternatives considered

1. **Ollama only** — free, local, low latency. But requires GPU for production scale and lower embedding quality.
2. **OpenAI only** — higher quality, cloud-hosted. But adds per-request cost (~$0.02/1M tokens) and external dependency.

## Decision

Support **both providers** via `EMBEDDING_PROVIDER` env var:

- **Default: Ollama** `nomic-embed-text` — 768 dimensions, free, runs locally alongside the app (Docker Compose includes Ollama service with auto-pull)
- **Alternative: OpenAI** `text-embedding-3-small` — 1536 dimensions, cloud-based, requires `OPENAI_API_KEY`

The `src/rag/embeddings.js` module abstracts the provider behind `generateEmbedding()`. Callers are unaware of which provider is active.

**Constraint:** Changing providers mid-production requires a vector dimension migration (`vector(768)` → `vector(1536)` in schema.sql) and re-embedding all cached data.

## Consequences

**Positive:**
- Local development works without any API keys (Ollama)
- Production can choose based on quality/cost tradeoff
- Single abstraction layer keeps RAG code provider-agnostic

**Negative:**
- Cannot mix providers — all vectors must share the same dimension
- Provider switch is a migration event, not a config flip
- Two code paths to maintain and test
