# ADR-0012: Local Pipeline Bypass for Dev/Testing

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Developer Experience

## Context

The full pipeline requires PostgreSQL + pgvector, Apify API access, and network connectivity. This makes local development and testing slow, expensive, and flaky. Developers need a way to iterate on analysis/aggregation prompts using pre-scraped profile data.

### Alternatives considered

1. **Mock all external services** — fast, but divergence between mocks and production causes bugs.
2. **Staging environment only** — realistic, but slow iteration and shared state.
3. **Record/replay (VCR-style)** — captures real responses, but fixtures become stale.

## Decision

When `USE_LOCAL_PROFILES=true`, the fetch job **skips Apify** and loads pre-scraped profiles from a mounted `profiles/{handle}/` directory. The local format (`grid.jpg`, `post_1.jpg`-`post_3.jpg`, `captions.json`) is **normalized to match Apify output**, so `analyzeJob` is unaware of the data source.

A standalone script (`scripts/run-local.js`) goes further — bypasses DB, pgvector, report signing, and audit trail entirely. It imports prompt templates directly and calls Anthropic API.

**What's bypassed:** DB, pgvector, Apify, report signing, audit trail  
**What's reused:** Prompt templates, `sanitizeCaption()`, Anthropic API

Expected layout per profile:
```
profiles/{handle}/
  grid.jpg          # grid screenshot (optional)
  post_1.jpg        # post images (optional)
  captions.json     # array of caption strings (optional)
  analysis.json     # written by script (cache)
```

## Consequences

**Positive:**
- Fast local iteration on prompts without API costs
- Deterministic: same input files → same analysis (modulo model non-determinism)
- `analyzeJob` doesn't know the difference — same code path for both modes

**Negative:**
- Local images must be pre-scraped manually
- No real-time Instagram data in local mode
- Signing and audit trails are skipped — local results aren't production-grade
