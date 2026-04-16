# NFR Requirements — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07  
**Security Extension**: ENABLED (blocking)

---

## 1. Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | Initial page load (LCP) | < 3 seconds on standard broadband |
| NFR-PERF-02 | Shell initial JS bundle | Best-effort optimisation — no hard limit; lazy-load all MFE remotes |
| NFR-PERF-03 | MFE module loading | All 4 remotes lazy-loaded via Webpack Module Federation dynamic import with Suspense |
| NFR-PERF-04 | Shared package tree-shaking | `@app/auth`, `@app/api-client`, `@app/ui` must be tree-shakeable; no barrel re-exports of large modules |
| NFR-PERF-05 | Font loading | Display and body fonts loaded with `font-display: swap` to prevent render blocking |

---

## 2. Scalability

| ID | Requirement |
|---|---|
| NFR-SCALE-01 | Target scale: < 50 concurrent users (MVP/internal tool) — no horizontal scaling requirements at this phase |
| NFR-SCALE-02 | Static assets served via AWS CloudFront CDN — inherently scalable; no origin overload risk at this scale |
| NFR-SCALE-03 | Module Federation remotes deployed as static bundles to S3 — stateless, infinitely cacheable |

---

## 3. Availability

| ID | Requirement |
|---|---|
| NFR-AVAIL-01 | CloudFront provides > 99.9% availability for static assets — no additional HA configuration required for MVP |
| NFR-AVAIL-02 | MFE load failure must not crash the entire application — `ModuleLoader` error boundary isolates failures per module |
| NFR-AVAIL-03 | `GlobalErrorBoundary` ensures the Shell remains functional even if an individual MFE throws an unhandled error |

---

## 4. Security

All SECURITY rules are enforced as **blocking constraints**. Compliance summary for U-01:

| Rule | Applicability | Requirement |
|---|---|---|
| SECURITY-01 | Yes | All asset delivery via HTTPS/TLS 1.2+; CloudFront enforces HTTPS redirect |
| SECURITY-02 | Yes | CloudFront access logging enabled (Phase 2); N/A for Phase 1 MVP |
| SECURITY-03 | Yes | Structured JSON console logging with timestamp, correlation ID, log level; no PII/tokens logged |
| SECURITY-04 | Yes | HTTP security headers set via CloudFront response headers policy: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| SECURITY-05 | N/A | U-01 has no API endpoints; input validation is enforced in U-02 (forms) and API client (typed errors) |
| SECURITY-06 | N/A | No IAM policies defined in U-01 code; covered in Infrastructure Design |
| SECURITY-07 | N/A | No network ACLs in U-01 code; covered in Infrastructure Design |
| SECURITY-08 | Yes | `AuthGuard` denies all protected routes by default; redirect to login if unauthenticated |
| SECURITY-09 | Yes | No default credentials; production error responses via `ErrorMessage` component never expose stack traces |
| SECURITY-10 | Yes | pnpm lockfile committed; `npm audit` / `pnpm audit` step in GitHub Actions CI pipeline |
| SECURITY-11 | Yes | Rate limiting on public endpoints handled by backend/CDN; `AuthGuard` is the app-layer control |
| SECURITY-12 | Yes | JWT in httpOnly cookie (managed by backend); only non-sensitive user profile in localStorage; brute-force protection in U-02 |
| SECURITY-13 | Yes | External scripts must use SRI attributes; no unsafe CDN script loading |
| SECURITY-14 | N/A Phase 1 | Alerting deferred to Phase 2; console logs provide Phase 1 observability |
| SECURITY-15 | Yes | `GlobalErrorBoundary` + per-module boundaries catch all errors; fail-closed; generic user messages only |

**Security findings**: None blocking. SECURITY-02 and SECURITY-14 are deferred to Phase 2 with documented rationale.

---

## 5. Reliability

| ID | Requirement |
|---|---|
| NFR-REL-01 | All external calls (MFE loads, API requests) have explicit error boundaries / error handling |
| NFR-REL-02 | `apiClient` global 401 interceptor ensures stale sessions never leave users in broken state |
| NFR-REL-03 | Sidebar collapse state persists across page refreshes via localStorage |
| NFR-REL-04 | Auth state restored from localStorage on load without network dependency |

---

## 6. Maintainability

| ID | Requirement |
|---|---|
| NFR-MAINT-01 | TypeScript strict mode enabled across all packages in U-01 |
| NFR-MAINT-02 | All `@app/*` packages export types alongside runtime code; no `any` in public APIs |
| NFR-MAINT-03 | All Shell components and `@app/ui` components have unit tests (Vitest + React Testing Library) |
| NFR-MAINT-04 | Tailwind design tokens documented in `@app/ui/tailwind.config.ts` with inline comments per token group |
| NFR-MAINT-05 | GitHub Actions CI runs: type-check, lint, unit tests, dependency audit on every PR |

---

## 7. Accessibility

| ID | Requirement |
|---|---|
| NFR-A11Y-01 | WCAG 2.1 Level AA compliance across all Shell and `@app/ui` components |
| NFR-A11Y-02 | All interactive elements (buttons, links, inputs) reachable via keyboard navigation |
| NFR-A11Y-03 | Colour contrast ratios meet WCAG AA: 4.5:1 for normal text, 3:1 for large text — Chinoiserie palette must be validated |
| NFR-A11Y-04 | `Sidebar` navigation uses `<nav>` with ARIA labels; active route indicated with `aria-current="page"` |
| NFR-A11Y-05 | `Dialog` component traps focus and returns focus to trigger on close |
| NFR-A11Y-06 | `Spinner` and loading states include `aria-live="polite"` announcements |
| NFR-A11Y-07 | Error messages linked to their form fields via `aria-describedby` |

---

## 8. Usability

| ID | Requirement |
|---|---|
| NFR-UX-01 | Chinoiserie visual aesthetic enforced via `@app/ui` shared tokens (NFR-UX-01–06 from requirements) |
| NFR-UX-02 | Sidebar collapsed/expanded state respects user preference across sessions |
| NFR-UX-03 | Loading states must not cause layout shift (use skeleton screens or fixed-size spinners) |
| NFR-UX-04 | Browser support: Chrome, Firefox, Safari, Edge — last 2 major versions |

---

## 9. Logging (Phase 1)

| ID | Requirement |
|---|---|
| NFR-LOG-01 | Structured JSON console logging (satisfies SECURITY-03 for Phase 1) |
| NFR-LOG-02 | Every log entry includes: `timestamp` (ISO 8601), `level` (info/warn/error), `correlationId` (UUID per session), `message` |
| NFR-LOG-03 | No passwords, tokens, PII, or stack traces in log output |
| NFR-LOG-04 | **Phase 2 upgrade**: Replace console transport with AWS CloudWatch Logs forwarding endpoint |

---

## 10. CI/CD (GitHub Actions)

| ID | Requirement |
|---|---|
| NFR-CI-01 | GitHub Actions pipeline on every PR: `type-check` → `lint` → `unit-test` → `pnpm audit` |
| NFR-CI-02 | Build pipeline on merge to main: `build` all packages in dependency order via Turborepo → deploy to S3 + CloudFront invalidation |
| NFR-CI-03 | Pinned tool versions in all workflow files — no `latest` tags (SECURITY-10) |
| NFR-CI-04 | Secrets (AWS credentials, API base URL) stored in GitHub Actions secrets — never in workflow YAML or committed files |
