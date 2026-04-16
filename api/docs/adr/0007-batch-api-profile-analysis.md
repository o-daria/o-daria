# ADR-0007: Batch API for Profile Analysis

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Cost Optimization

## Context

Profile analysis is the most expensive pipeline step — each profile requires a Sonnet call with images (~$0.016 per profile). A report with 24 profiles costs ~$0.38 synchronously. The Anthropic Batch API offers a 50% discount for asynchronous processing.

### Alternatives considered

1. **Synchronous `messages.create()` per profile** — simplest, but 2x cost.
2. **Parallel synchronous calls** — faster than sequential, same cost.
3. **Queue-based processing** — adds infrastructure (Redis/SQS) for marginal benefit over Batch API.

## Decision

Profile analysis uses the **Anthropic Batch API** (`messages.batches.create()`). Uncached profiles are grouped into chunks of 5 (`CHUNK_SIZE = 5`), submitted as batch requests, and polled every 10 seconds until complete.

- System prompt uses ephemeral caching (shared across all requests in a batch → additional savings)
- `custom_id` is set to the handle — enforced on result parsing (never trust model output for identity)
- Batch results are streamed via `messages.batches.results()`

## Consequences

**Positive:**
- 50% cost reduction on the most expensive pipeline step
- Chunks of 5 fit comfortably under API limits
- Ephemeral cache on system prompt adds further savings

**Negative:**
- Adds 2-3 minutes latency (batch processing time + polling interval)
- Cannot stream live analysis progress to client
- Batch failures affect entire chunks, not individual profiles
