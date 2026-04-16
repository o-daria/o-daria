# ADR-0004: Brand DNA Compilation as Structured Intermediate

**Date:** 2025-01  
**Status:** Accepted  
**Category:** RAG

## Context

Users describe their brand in free text: "cozy mountain glamping, premium but not pretentious." Two paraphrases of the same brief would produce inconsistent analysis outputs if injected directly into prompts. The analysis and aggregation prompts need a stable, structured representation of brand identity.

### Alternatives considered

1. **Pass raw text directly to prompts** — simple, but inconsistent outputs across paraphrases and no clear contract for what "brand context" contains.
2. **Structured form input** — forces users to fill in specific fields. Better consistency but worse UX and limited expressiveness.

## Decision

A **Haiku compilation step** (`brandDnaCompiler.compileBrandDna()`) converts free-text brand input into a structured JSON object with fields: `tone`, `values`, `visual_vocabulary`, `anti_values`, `positioning_tension`, `audience_aspiration`, `key_differentiator`. This object is then formatted into a string (`formatBrandDnaForPrompt()`) for injection into analysis/aggregation prompts.

**Invariant:** Raw `brand_input` must never be passed directly to analysis or aggregation prompts. Always compile first.

## Consequences

**Positive:**
- Consistent analysis regardless of how the user phrases their brand description
- Clear contract: downstream prompts receive a known schema
- Enables brand DNA versioning (new brief → new object → visible diff)
- Decouples prompt tuning from user communication style

**Negative:**
- Extra API call per report (Haiku, ~$0.001)
- Compilation quality depends on the brand DNA prompt — edge cases may lose nuance
