# ADR-0001: Async Report Generation with Polling

**Date:** 2025-01  
**Status:** Accepted  
**Category:** API Design

## Context

The pipeline scrapes Instagram profiles via Apify, runs multi-step AI analysis (Sonnet for per-profile, Haiku for aggregation/validation), and produces a structured audience report. End-to-end latency ranges from 1 to 5 minutes depending on handle count and cache hit rate.

A synchronous HTTP response would force clients to hold a connection open for minutes, risking timeouts and making horizontal scaling difficult.

### Alternatives considered

1. **Synchronous response** — simple for clients, but HTTP timeouts and no graceful degradation under load.
2. **WebSocket / SSE streaming** — real-time progress, but adds client complexity and infra (sticky sessions or pub/sub).
3. **Webhook callback** — push-based, but requires clients to expose an endpoint and handle retries.

## Decision

`POST /reports` returns **202 Accepted** immediately with a `report_id` and `poll_url`. The pipeline runs asynchronously in the background. Clients poll `GET /reports/:id` for status (`pending` → `running` → `done` | `failed`).

Key implementation details:
- `src/app.js` fires `runPipeline()` without awaiting — fire-and-forget with error logging
- Report status is tracked in PostgreSQL (`reports.status` column)
- No webhook or streaming alternative is currently offered

## Consequences

**Positive:**
- Decouples API availability from pipeline latency
- Horizontal scaling: no long-lived connections
- Simple client integration (any HTTP client can poll)

**Negative:**
- Clients must implement polling logic
- No real-time progress visibility (only status transitions)
- Slight delay between completion and client awareness (poll interval)
