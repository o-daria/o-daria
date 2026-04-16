# NFR Design Plan — U-01: Shell & Shared Infrastructure

# Marketing Audience Analysis Platform (ui)

**Phase**: CONSTRUCTION — NFR Design  
**Unit**: U-01 Shell & Shared Infrastructure  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

- [x] Step 1: Analyze NFR requirements artifacts
- [x] Step 2: Create NFR Design Plan (this document)
- [x] Step 3: Generate clarifying questions (see Section 2)
- [x] Step 4: Store plan (this file)
- [x] Step 5: Collect and analyze answers — no contradictions; CSP deferred to Infra Design; 7-day session noted
- [x] Step 6: Generate NFR design artifacts
- [x] Step 7: Present completion message
- [x] Step 8: User approved — "Continue to Next Stage"

---

## Already-Decided NFR Design Elements (no questions needed)

| Area                   | Decision                                                                 |
| ---------------------- | ------------------------------------------------------------------------ |
| Error boundary pattern | `GlobalErrorBoundary` (Shell) + per-module boundary per MFE; fail-closed |
| MFE load failure       | `ModuleLoader` error boundary with retry; does not crash Shell           |
| CDN/scalability        | CloudFront static distribution; no scaling design needed at < 50 users   |
| Logging structure      | Structured JSON logger service; console transport Phase 1                |
| Auth interception      | `apiClient` response interceptor; 401 → logout + redirect                |
| Dependency scanning    | `pnpm audit` in GitHub Actions CI                                        |

---

## Section 2: Clarifying Questions

Please fill in the letter choice after each `[Answer]:` tag.

---

### Q1 — API Request Retry Strategy

Should the `apiClient` automatically retry failed requests (network errors / 5xx)?

A) No retries — fail immediately and let the component handle the error
B) Retry once on network error only (not on 4xx/5xx responses)
C) Retry up to 3 times with exponential backoff on network errors and 5xx responses (excluding 401/403)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2 — Content Security Policy Scope

What should the CSP `default-src` policy allow beyond `'self'`?

A) Strict: `default-src 'self'` only — all external resources (fonts, APIs) must be proxied or same-origin
B) Practical: `'self'` + Google Fonts domains (`fonts.googleapis.com`, `fonts.gstatic.com`) + the external API domain
C) Deferred — define the full CSP at Infrastructure Design stage; use a permissive placeholder now
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q3 — Session Expiry Duration

How long should the auth session remain valid before requiring re-login?

A) 1 hour — short-lived; appropriate for security-sensitive tools
B) 8 hours — standard working day; users stay logged in through a work session
C) 24 hours — one full day
D) 7 days — long-lived session; convenience over security
X) Other (please describe after [Answer]: tag below)

[Answer]: D

### Q4 — CORS Allowed Origins

How should CORS be configured for cross-origin requests from the SPA to the external API?

A) Handled entirely by the backend — the SPA uses `withCredentials: true`; backend controls allowed origins
B) The frontend must also set an explicit `Access-Control-Allow-Origin` header (only applicable if a proxy layer is added)
C) Not applicable — all API calls are same-origin (API and SPA served from same domain)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Q5 — Logger Service Pattern

How should the frontend logger be structured?

A) Simple wrapper: a `logger` singleton with `info()`, `warn()`, `error()` methods that format to JSON and write to `console`
B) Same as A + pluggable transport: `logger` accepts a `transport` interface so Phase 2 can swap console for CloudWatch without code changes
C) No dedicated logger — use `console.log/warn/error` directly in components
X) Other (please describe after [Answer]: tag below)

[Answer]: B
