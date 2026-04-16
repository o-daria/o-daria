# ADR-0010: DB-Backed Immutable Prompt Versioning

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Prompts

## Context

Prompts change frequently during development and tuning. Without versioning, it's impossible to reproduce a past report or A/B test prompt variants. File-only versioning (git) doesn't support runtime version selection or per-report version stamping.

### Alternatives considered

1. **File-only (git versioning)** — simplest, but no runtime version selection and no per-report stamps.
2. **Feature flags for prompt variants** — flexible, but adds flag management overhead.
3. **External prompt management (LangSmith, etc.)** — powerful, but adds vendor dependency.

## Decision

Prompts are stored in the **`prompt_versions` DB table** (immutable, append-only). Each row contains `name`, `version`, `body`, `model_hint`. Reports snapshot which versions were used in `integrity.prompt_versions`.

Workflow:
1. Edit template in `src/prompts/templates/`
2. Bump version string in `src/prompts/registry.js`
3. Run `npm run seed-prompts` to register the new version in DB
4. Old versions remain available for A/B testing and reproducibility

A/B testing: pass `{ prompt_versions: { analysis: 'v2.1' } }` in POST body to pin specific versions.

**Invariant:** File changes are invisible to production until seeded. Never mutate old versions — only insert new ones.

## Consequences

**Positive:**
- Exact reproducibility: re-run with pinned prompt versions
- A/B testing without code changes
- Audit trail: every report records which prompts produced it
- Immutability: old versions are never modified

**Negative:**
- Two-step deployment: edit file + seed DB (easy to forget)
- DB dependency for prompt reads (mitigated by in-process fallback in registry)
