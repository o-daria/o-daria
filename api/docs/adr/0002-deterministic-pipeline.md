# ADR-0002: Deterministic Pipeline Routing

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Pipeline

## Context

AI orchestration systems often use dynamic routing (e.g., LLM decides next step, conditional branching based on intermediate results). This provides flexibility but makes outputs harder to audit, reproduce, and debug.

For marketing teams, report consistency and auditability matter more than adaptive intelligence in routing. The intelligence lives inside each job node (prompts, RAG calibration), not in how jobs are sequenced.

### Alternatives considered

1. **Dynamic/agent-style routing** — LLM decides next step based on intermediate results. Flexible but non-reproducible and hard to audit.
2. **DAG with conditional edges** — e.g., skip aggregation if too few profiles. Adds complexity without clear benefit.

## Decision

The pipeline follows a **hardcoded linear sequence**: validate handles → compile brand DNA → fetch profiles → analyze → aggregate → validate → sign. The only adaptive behavior is the validation gate: on `ValidationError`, the orchestrator retries the failed job once with clarification notes injected.

Routing is intentionally NOT dynamic (see `src/pipeline/orchestrator.js`).

## Consequences

**Positive:**
- Fully reproducible given same inputs + model/prompt versions
- Simple audit trail — every report follows the same path
- Easy to reason about failures (which step failed?)

**Negative:**
- Cannot skip expensive steps even when they may be unnecessary
- Adding new conditional logic requires code changes, not configuration
