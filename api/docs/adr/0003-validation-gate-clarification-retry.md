# ADR-0003: Semantic Validation Gate with Clarification Retry

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Pipeline

## Context

JSON schema validation catches structural issues (missing fields, wrong types) but not semantic coherence — for example, an `alignment_score.overall` of 9/10 with a rationale that says "poor fit". Silent low-quality outputs erode trust in the platform.

### Alternatives considered

1. **Schema-only validation** — fast and deterministic, but misses semantic issues.
2. **Human review queue** — highest quality, but blocks pipeline and doesn't scale.
3. **Multiple retries** — higher recovery rate, but risk of infinite loops and increased cost/latency.

## Decision

After analyze and aggregate steps, a **Haiku-based semantic QA gate** (`validateJob.runValidation()`) checks for critical inconsistencies. On `ValidationError`, the orchestrator catches it and reruns the failed job **once** with the validation issues injected as clarification notes in Ukrainian.

- `MAX_CLARIFICATION_RETRIES = 1` — hard fail on second attempt
- Clarification notes are built by `buildClarificationNote()` and appended to the retry prompt
- `ValidationError` must never be swallowed — it propagates to `status='failed'` if retry also fails

## Consequences

**Positive:**
- Catches semantic incoherence that schema validation misses
- Self-correction: model gets explicit feedback on what went wrong
- Bounded: exactly one retry prevents infinite loops

**Negative:**
- Adds latency (extra Haiku call per validation, plus retry if failed)
- Cannot fix fundamental model hallucinations — only inconsistencies
- Clarification prompt quality is critical (bad notes → bad retry)
