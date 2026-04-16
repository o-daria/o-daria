# ADR-0008: Handle Pseudonymization with SHA256

**Date:** 2025-01  
**Status:** Accepted  
**Category:** Security / Privacy

## Context

Instagram handles are personally identifiable information (PII) under GDPR — they are linkable identifiers that can identify individuals. The `profile_analyses` cache is shared across tenants, so storing plaintext handles would leak handle associations across clients.

### Alternatives considered

1. **Plaintext handles in cache** — simplest lookup, but GDPR non-compliant and leaks cross-tenant data.
2. **Tenant-scoped cache** — no cross-tenant leakage, but eliminates the cost savings of shared caching.
3. **Encryption** — reversible, but adds key management complexity.

## Decision

Plaintext handles are **never stored** in the shared `profile_analyses` cache. Instead:

- `piiHandler.hashHandle()` produces a deterministic SHA256 hash
- `pseudonymizeAnalysis()` strips the plaintext handle and stores `handle_hash` only
- `rehydrateAnalysis()` re-attaches the plaintext handle from the tenant-scoped report context for in-pipeline use

Plaintext handles exist only in tenant-scoped report data (`reports.report_json`), which can optionally be hashed too via `keepHandles=false` (default).

**Invariant:** Cache writes must receive already-pseudonymized analysis. Plaintext handles live only in tenant-scoped report context.

## Consequences

**Positive:**
- GDPR-compliant: shared cache contains no PII
- Deterministic hashing enables cache lookups without storing plaintext
- GDPR Art. 17 (right to erasure): can null out handles without deleting analytical records
- Cross-tenant cache sharing preserved

**Negative:**
- SHA256 is irreversible but not salted — theoretically vulnerable to brute-force on known handle lists (low risk given handle format)
- Extra processing step on every cache read/write
