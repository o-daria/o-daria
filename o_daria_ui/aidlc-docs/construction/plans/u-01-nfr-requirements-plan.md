# NFR Requirements Plan — U-01: Shell & Shared Infrastructure

# Marketing Audience Analysis Platform (o_daria_ui)

**Phase**: CONSTRUCTION — NFR Requirements  
**Unit**: U-01 Shell & Shared Infrastructure  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

- [x] Step 1: Analyze functional design artifacts
- [x] Step 2: Create NFR Requirements Plan (this document)
- [x] Step 3: Generate clarifying questions (see Section 2)
- [x] Step 4: Store plan (this file)
- [x] Step 5: Collect and analyze answers — no contradictions; console logging satisfies SECURITY-03 Phase 1; Phase 2 upgrade to centralised service noted
- [x] Step 6: Generate NFR artifacts
- [x] Step 7: Present completion message
- [x] Step 8: User approved — "Continue to Next Stage"

---

## Already-Known NFR Context (from Requirements)

The following NFRs are already established and will be carried into artifacts without re-asking:

| Area         | Already Decided                                                       |
| ------------ | --------------------------------------------------------------------- |
| Security     | Security Baseline ENABLED (SECURITY-01 through SECURITY-15, blocking) |
| Scale        | Small — < 50 concurrent users (MVP)                                   |
| Deployment   | AWS (S3 + CloudFront), IaC required                                   |
| Performance  | LCP < 3s; lazy-loaded MFE modules                                     |
| Logging      | Structured logging, correlation IDs, no PII/secrets                   |
| Dependencies | Lock file committed; vulnerability scanning in CI                     |
| TypeScript   | Strict mode across all packages                                       |

---

## Section 2: Clarifying Questions

Please fill in the letter choice after each `[Answer]:` tag.

---

### Q1 — Browser Support

What browser support range is required for the application?

A) Modern evergreen browsers only — Chrome, Firefox, Safari, Edge (last 2 major versions)
B) Wider support — include Safari iOS 14+, Chrome Android, and legacy Edge
C) Modern + IE11 fallback (not recommended — significantly increases bundle size)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2 — Accessibility (a11y) Standard

What accessibility standard should the UI meet?

A) WCAG 2.1 Level A — basic accessibility (minimum)
B) WCAG 2.1 Level AA — standard for most production applications (recommended)
C) No formal accessibility requirement for this phase
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Q3 — Bundle Size Budget

Is there a target JavaScript bundle size for the Shell initial load?

A) No hard limit — optimise as a best effort
B) Shell initial bundle < 200 KB gzipped (aggressive; requires careful code splitting)
C) Shell initial bundle < 500 KB gzipped (standard; achievable with lazy-loaded MFEs)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Q4 — Logging Service

Where should structured logs from the frontend be sent?

A) AWS CloudWatch Logs (via a lightweight log forwarding endpoint on the backend)
B) A third-party service (e.g., Datadog, Sentry, LogRocket)
C) Console only for now — no centralised log aggregation in Phase 1
X) Other (please describe after [Answer]: tag below)

[Answer]: C

### Q5 — Error Monitoring

Should client-side errors be captured and reported to an error monitoring service?

A) Yes — Sentry (error tracking, source maps, release tracking)
B) Yes — AWS CloudWatch RUM (Real User Monitoring, native AWS integration)
C) No — rely on server-side logs and user-reported issues for Phase 1
X) Other (please describe after [Answer]: tag below)

[Answer]: C

### Q6 — CI/CD Platform

Which CI/CD platform will be used for automated builds, tests, and deployments?

A) GitHub Actions
B) AWS CodePipeline + CodeBuild
C) GitLab CI/CD
D) Bitbucket Pipelines
X) Other (please describe after [Answer]: tag below)

[Answer]: A
