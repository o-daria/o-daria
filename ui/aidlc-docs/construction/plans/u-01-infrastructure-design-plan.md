# Infrastructure Design Plan — U-01: Shell & Shared Infrastructure

# Marketing Audience Analysis Platform (ui)

**Phase**: CONSTRUCTION — Infrastructure Design  
**Unit**: U-01 Shell & Shared Infrastructure  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

- [x] Step 1: Analyze functional and NFR design artifacts
- [x] Step 2: Create Infrastructure Design Plan (this document)
- [x] Step 3: Generate clarifying questions (see Section 2)
- [x] Step 4: Store plan (this file)
- [x] Step 5: Collect and analyze answers — contradiction detected and resolved
- [x] Step 5b: Font hosting = Google Fonts CDN (A). NFR Design 2.3 updated. CSP must allowlist Google Fonts domains. SRI required per SECURITY-13.
- [x] Step 6: Generate infrastructure design artifacts
- [x] Step 7: Present completion message
- [x] Step 8: User approved — "Continue to Next Stage"

---

## Already-Decided Infrastructure (no questions needed)

| Area                  | Decision                                 |
| --------------------- | ---------------------------------------- |
| Cloud provider        | AWS                                      |
| Static hosting        | S3 + CloudFront                          |
| CDN                   | CloudFront distribution                  |
| CI/CD                 | GitHub Actions                           |
| HTTP security headers | CloudFront Response Headers Policy       |
| Fonts                 | Self-hosted in S3 (not Google Fonts CDN) |
| IaC required          | Yes (tool TBD — see Q2)                  |

---

## Section 2: Clarifying Questions

Please fill in the letter choice after each `[Answer]:` tag.

---

### Q1 — AWS Environments

How many AWS deployment environments are needed?

A) One environment only — production (simplest; no staging)
B) Two environments — staging + production
C) Three environments — development + staging + production
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2 — Infrastructure as Code Tool

Which IaC tool should be used to define AWS resources?

A) AWS CDK (TypeScript) — code-first, aligns with the TypeScript monorepo
B) Terraform — declarative HCL, cloud-agnostic, widely adopted
C) AWS CloudFormation (raw YAML/JSON) — no extra tooling
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q3 — CloudFront Distribution Topology

How should the MFE remotes and Shell be distributed via CloudFront?

A) Single distribution — Shell and all 4 MFE remotes served from one CloudFront distribution under path prefixes (`/shell/*`, `/mfe-auth/*`, etc.)
B) Separate distributions — each unit (Shell + 4 MFEs) gets its own CloudFront distribution/subdomain for true independent deployment
C) Single distribution for now — paths prefixed per MFE; migrate to separate distributions in Phase 2
X) Other (please describe after [Answer]: tag below)

[Answer]: X

Please advise on the most efficient, best practice approach.

### Q4 — Custom Domain & SSL

Will the application use a custom domain with SSL?

A) Yes — custom domain with ACM (AWS Certificate Manager) SSL certificate; Route 53 for DNS
B) Yes — custom domain but DNS managed outside AWS (e.g., Cloudflare, GoDaddy); ACM for SSL
C) No custom domain for now — use the CloudFront default domain (`*.cloudfront.net`)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

### Q5 — S3 Bucket Strategy

How should S3 buckets be organised for static asset storage?

A) One bucket per environment (e.g., `app-staging`, `app-production`) — all MFEs and Shell in the same bucket under prefixed paths
B) One bucket per unit per environment (e.g., `app-shell-prod`, `app-mfe-auth-prod`) — fully isolated storage
C) One shared bucket with environment prefixes and unit subdirectories
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Q6 — Content Security Policy Values

The CSP was deferred to this stage. What external origins must the CSP allow?

A) No external origins — all resources (fonts, API calls) are same-origin or proxied; strict `default-src 'self'`
B) API domain only — the external backend API has a different domain that must be in `connect-src`
C) API domain + any other known external origins (please specify after [Answer]: tag)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

Only google fonts come up right now.

---

## Section 3: Clarification Required — Font Hosting Contradiction

**Issue detected**: Q3 and Q6 responses conflict with a prior NFR Design decision.

**Prior decision (NFR Design 2.3)**:

> Fonts self-hosted in `shell/public/fonts/` — rationale: satisfy strict CSP (`'self'` only), eliminate third-party DNS latency, avoid SRI hash requirement for external scripts (SECURITY-13).

**New Q6 response**: "Only Google Fonts come up right now" — implies loading fonts from `fonts.googleapis.com` / `fonts.gstatic.com` (external CDN).

These two approaches are mutually exclusive. Please choose:

### Clarification Q — Font Hosting Strategy

A) **Keep Google Fonts (CDN)** — Load fonts from `fonts.googleapis.com` / `fonts.gstatic.com`. The CSP `font-src` and `style-src` must allowlist these domains. SRI attributes required on `<link>` tags per SECURITY-13. Slight performance overhead from external DNS lookup.

B) **Self-host fonts** — Download Cormorant Garamond + Inter and serve from S3 (committed to the Shell package as static assets). Strict `'self'`-only CSP. No SRI needed. Slightly better performance (no third-party DNS). More setup work initially.

[Answer]: A
