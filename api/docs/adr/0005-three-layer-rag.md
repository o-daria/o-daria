# ADR-0005: Three-Layer RAG System

**Date:** 2025-01  
**Status:** Accepted  
**Category:** RAG

## Context

The platform analyzes Instagram profiles repeatedly across tenants. Without caching, every profile requires a Sonnet API call (~$0.016). Without calibration, the model produces inconsistent outputs for niche profiles (e.g., Ukrainian yoga instructors). Without cross-client learning, each tenant starts from zero.

### Alternatives considered

1. **No RAG** — simplest, but expensive and inconsistent.
2. **Single cache layer** — reduces cost but no calibration or learning.
3. **Full knowledge graph** — maximum context, but over-engineered for the current scale.

## Decision

Three distinct RAG layers, all backed by pgvector:

### 1. Profile Cache (`profile_analyses` table)
- **Purpose:** Skip Sonnet entirely on cache hit
- **Scope:** Handle-scoped, shared across tenants (analyses are brand-agnostic)
- **TTL:** 45 days
- **Key:** `handle_hash` (SHA256, not plaintext — see ADR-0008)

### 2. Profile Similarity (same table, different query)
- **Purpose:** k=2 nearest neighbor profiles injected as few-shot calibration examples
- **Scope:** Cross-tenant (embeddings are brand-agnostic)
- **Query:** Vector similarity search on profile embedding

### 3. Segment Library (`segment_library` table)
- **Purpose:** Cross-client learning for audience segmentation
- **Scope:** Cross-tenant with **isolation**: reads always filter `WHERE tenant_id != requesting_tenant`
- **Write pattern:** Append-only (INSERT only, no UPDATE/DELETE)
- **Value:** After hundreds of reports, builds a taxonomy that calibrates segment naming and scoring

**Invariant:** Segment library reads must always exclude the requesting tenant. This prevents competitive intelligence leakage.

## Consequences

**Positive:**
- 40-60% cache hit rate after first month → significant cost savings
- Few-shot calibration improves consistency on niche profiles
- Segment library becomes a platform moat over time
- Tenant isolation preserved despite cross-client learning

**Negative:**
- pgvector dependency adds operational complexity
- Embedding dimension must match across all providers (schema migration if changed)
- Stale cache entries may return outdated analyses (mitigated by 45-day TTL)
