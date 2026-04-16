# ADR-0009: Output Signing with Integrity Block

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Security / Auditability

## Context

Reports are stored in PostgreSQL and returned via API. Without integrity verification, manual DB edits (accidental or malicious) would go undetected. Marketing teams need to trust that reports haven't been tampered with, and disputes require proof of what model/prompt produced a given output.

### Alternatives considered

1. **No signing** — simpler, but no tamper detection.
2. **Full cryptographic signing (RSA/ECDSA)** — stronger guarantees, but adds key management and is overkill for internal integrity.
3. **Blockchain-style append-only log** — immutable but massive overhead for the use case.

## Decision

Every completed report is signed with an **integrity block** containing:

- `checksum`: SHA256 of `(audience_segments + content_strategy_pillars + alignment_score)` using deterministic JSON serialization (`stableSerialize()` with sorted keys)
- `model_versions`: which Claude models were used
- `prompt_versions`: which prompt versions were used
- `handle_count`: number of profiles analyzed
- `generated_at`: timestamp

`GET /reports/:id` re-computes the checksum and returns **500** on mismatch.

**Invariant:** Every completed report must be signed before DB persistence. The GET endpoint always verifies.

## Consequences

**Positive:**
- Detects tampering (manual DB edits, corruption)
- Full reproducibility: re-run at exact model + prompt versions
- Supports disputes: "which model produced this?" is answerable
- Deterministic serialization ensures hash stability

**Negative:**
- Schema changes to signed fields require migration of existing checksums
- 500 on mismatch is aggressive — no graceful degradation for corrupted reports
