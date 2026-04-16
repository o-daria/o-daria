# Application Design

## Overview

This document consolidates the application design for the o_daria production-readiness effort. Full details are in the individual artifact files; this document provides a navigable summary.

---

## Infrastructure Reality (from codebase exploration)

| Area | Current State | Target State |
|------|--------------|-------------|
| FE Terraform | `o_daria_ui/infra/terraform/` — FE only (1 CF + 1 S3) | Migrate to `o_daria/infra/terraform/` — unified full-stack |
| BE IaC | None — Docker Compose only | EC2 t4g.nano + Docker, provisioned in unified Terraform |
| CloudFront | 1 distribution, single S3 origin, no MFE path behaviors | Same distribution; update CSP for Google Sign-In origins |
| S3 FE | 1 bucket (`o-daria-ui-prod`) with prefix paths per MFE | Unchanged — already correct |
| S3 images | None | New private bucket; accessed only by BE EC2 IAM role |
| deploy.yml | Builds 5 MFEs, syncs to single S3 bucket | Add `GOOGLE_CLIENT_ID` to build env; no other changes |

---

## Design Decisions (from application-design-plan.md)

| Q | Decision | Choice |
|---|----------|--------|
| Q1 | `POST /auth/google` location | Dedicated `src/routes/auth.routes.js` — mounted at `/auth` |
| Q2 | Google token validation | Dedicated `src/services/googleAuthService.js` — testable functions |
| Q3 | `authenticate()` middleware | Move to `src/middleware/auth.middleware.js` |
| Q4 | S3 integration scope | S3 client + upload in `POST /reports`; S3 keys stored in DB |
| Q5 | Email/password exports | Soft remove — `@deprecated` JSDoc stubs (no hard delete) |
| Q6 | `apiClient` location | `packages/@app/api-client/src/apiClient.ts` — token injected via `defaults.headers.common` |
| Q7 | Old auth pages removal | Routes removed; source files left as dead code |
| Q8 | Terraform state | Net-new unified Terraform at monorepo root; no live state to migrate |
| —  | BE hosting | EC2 t4g.nano + Docker (user choice) |
| —  | Terraform location | `o_daria/infra/terraform/` monorepo root (Option A, user choice) |

---

## Component Summary

### Backend — New

| Component | File | Purpose |
|-----------|------|---------|
| `AuthRouter` | `o_daria_be/src/routes/auth.routes.js` | `POST /auth/google` endpoint |
| `GoogleAuthService` | `o_daria_be/src/services/googleAuthService.js` | Token verify, user upsert, session create |
| `AuthMiddleware` | `o_daria_be/src/middleware/auth.middleware.js` | Session DB lookup + API_KEY dev shortcut |
| `S3Service` | `o_daria_be/src/services/s3Service.js` | Image upload to S3 images bucket |

### Backend — Modified

| Component | File | Change |
|-----------|------|--------|
| `app.js` | `o_daria_be/src/app.js` | Mount AuthRouter; import AuthMiddleware; add FRONTEND_URL to CORS; wire S3Service into POST /reports |
| `migrate.sh` | `o_daria_be/scripts/migrate.sh` | Add `schema_auth.sql` as 3rd file |
| `docker-compose.yml` | `o_daria_be/docker-compose.yml` | Mount `schema_auth.sql` as `03_schema_auth.sql` in db init |

### Frontend — New

| Component | File | Purpose |
|-----------|------|---------|
| `googleAuthService.ts` | `o_daria_ui/packages/@app/auth/src/googleAuthService.ts` | HTTP call to `POST /auth/google` |

### Frontend — Modified

| Component | File | Change |
|-----------|------|--------|
| `tokenStorage.ts` | `packages/@app/auth/src/tokenStorage.ts` | Add token storage (getToken, setToken, clearAll) |
| `AuthService.ts` | `packages/@app/auth/src/AuthService.ts` | Add `loginWithGoogle`; soft-deprecate email/password methods |
| `AuthContext.tsx` | `packages/@app/auth/src/AuthContext.tsx` | Replace `login` with `loginWithGoogle` in context shape |
| `AuthProvider.tsx` | `packages/@app/auth/src/AuthProvider.tsx` | Token injection into apiClient; session restore on mount; 401 handler |
| `LoginPage.tsx` | `apps/mfe-auth/src/pages/LoginPage.tsx` | Replace Formik form with `<GoogleLogin>` button |
| `App.tsx` (shell) | `apps/shell/src/App.tsx` | Add `GoogleOAuthProvider` wrapper |
| `webpack.config.js` (shell) | `apps/shell/webpack.config.js` | Add `GOOGLE_CLIENT_ID` to DefinePlugin |
| `webpack.config.js` (mfe-auth) | `apps/mfe-auth/webpack.config.js` | Add `GOOGLE_CLIENT_ID` to DefinePlugin |
| `deploy.yml` | `.github/workflows/deploy.yml` | Add `GOOGLE_CLIENT_ID` to build env |

### Infrastructure — New

| Component | Location | Purpose |
|-----------|----------|---------|
| Root Terraform | `o_daria/infra/terraform/` | Unified IaC — FE + BE + DB + S3 images |
| `modules/s3-images/` | `o_daria/infra/terraform/modules/s3-images/` | Private S3 bucket for profile images |
| `modules/ec2-be/` | `o_daria/infra/terraform/modules/ec2-be/` | EC2 t4g.nano + security group + IAM instance role |
| `docker-compose.local.yml` | `o_daria/docker-compose.local.yml` | Single-command local full-stack preview |
| `Dockerfile.local` | `o_daria_ui/Dockerfile.local` | Multi-stage: pnpm build → nginx static serve |
| `nginx.local.conf` | `o_daria_ui/infra/nginx/nginx.local.conf` | MFE path routing + API proxy + security headers |

### Infrastructure — Migrated/Modified

| Component | From | To | Change |
|-----------|------|----|--------|
| `modules/s3-hosting/` | `o_daria_ui/infra/terraform/` | `o_daria/infra/terraform/` | Migrate unchanged |
| `modules/cloudfront/` | `o_daria_ui/infra/terraform/` | `o_daria/infra/terraform/` | Update CSP for Google Sign-In (`accounts.google.com`, `*.googleapis.com`) |
| `modules/iam-deploy/` | `o_daria_ui/infra/terraform/` | `o_daria/infra/terraform/` | Migrate unchanged |
| `schema_auth.sql` | (new) | `o_daria_be/src/db/schema_auth.sql` | New — users + sessions tables |

---

## Architecture Diagram

```
BROWSER
  |
  +--[CloudFront /]---------> S3 o-daria-ui-prod/shell/       (App.tsx, GoogleOAuthProvider)
  +--[CloudFront /mfe-auth/]-> S3 o-daria-ui-prod/mfe-auth/   (LoginPage, GoogleLogin button)
  +--[CloudFront /mfe-*/]---->  S3 o-daria-ui-prod/mfe-*/     (other MFEs)
  |
  +--[POST /auth/google]-----> EC2 t4g.nano (Docker: api:3300)
  |                              AuthRouter
  |                              GoogleAuthService
  |                                +--> Google OAuth API (verify token)
  |                                +--> PostgreSQL (upsert tenant/user/session)
  |                            { token, user }
  |
  +--[GET /projects etc.]----> EC2 t4g.nano (Docker: api:3300)
                               AuthMiddleware (DB session lookup)
                               Route handler (tenant-scoped queries)
                                 +--> PostgreSQL
                                 +--> S3 o-daria-images (profile image upload)
                                 +--> Ollama (embeddings)
                                 +--> Claude API (analysis)

UNIFIED TERRAFORM (o_daria/infra/terraform/)
  module.s3_hosting       -> S3 o-daria-ui-prod (FE assets)
  module.cloudfront       -> CloudFront distribution
  module.iam_deploy       -> IAM user for GitHub Actions
  module.s3_images        -> S3 o-daria-images (private, BE role only)
  module.ec2_be           -> EC2 t4g.nano + IAM instance role + security group
```

---

## Key Design Constraints

1. **`tenantId` type bridge**: `users.tenant_id` is UUID FK; existing `reports` and `projects` use `TEXT NOT NULL`. `AuthMiddleware` calls `.toString()` before setting `req.tenantId` — no schema changes to existing tables.

2. **`GoogleOAuthProvider` in shell**: Must live in `App.tsx` (Module Federation host). `@app/auth` is a singleton shared module — its context is available to all remotes only when the provider is in the host.

3. **`apiClient` singleton**: Shared across all MFEs via Module Federation. `AuthProvider` injects `defaults.headers.common['Authorization']` once; all subsequent calls from any MFE carry the token automatically.

4. **`registerUnauthorizedHandler`**: `AuthProvider` wires `@app/api-client`'s 401 interceptor to call `logout()`. Any expired session triggers automatic cleanup — no per-MFE 401 handling needed.

5. **S3 key sanitization**: Keys are `profiles/<reportId>/<uuid>.<ext>` — only the extension comes from the original filename. Raw user-supplied strings never reach the S3 key.

6. **Terraform migration**: Existing `o_daria_ui/infra/terraform/` modules are migrated to `o_daria/infra/terraform/`. State backend reuses the existing `o-daria-ui-tfstate` S3 bucket under a new key. The old FE-only Terraform directory is left in place (not deleted) until the new root Terraform is verified.

7. **EC2 + Docker BE deployment**: The EC2 instance runs the same `docker-compose.yml` that works locally (minus dev overrides). SSH key pair provisioned by Terraform; BE deployments are SSH + `docker compose pull && docker compose up -d` (no ECS/ECR needed at 1-user scale).

---

## Detailed Artifacts

- [components.md](components.md) — Full component definitions and responsibilities
- [component-methods.md](component-methods.md) — Method signatures and contracts
- [services.md](services.md) — Service orchestration patterns and interaction flows
- [component-dependency.md](component-dependency.md) — Dependency matrix and data flow diagrams

---

## Security Baseline Compliance (Application Design Stage)

| Rule | Status | Notes |
|------|--------|-------|
| SECURITY-01: Authentication | Compliant | Google OAuth 2.0 via `google-auth-library`; server-side token verification on every request |
| SECURITY-02: Authorization | Compliant | All routes protected by `AuthMiddleware`; tenant isolation via `req.tenantId` |
| SECURITY-03: Logging | Compliant | `AuthMiddleware` never logs token value; structured log entries include timestamp, level, message |
| SECURITY-04: HTTP Headers | Compliant | nginx.local.conf + CloudFront response headers policy: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| SECURITY-05: Input Validation | Compliant | `credential` validated non-empty before `verifyIdToken()`; S3 keys sanitized (no raw user filenames) |
| SECURITY-06: Access Control | Compliant | IAM deploy user: S3 sync + CF invalidation only; EC2 instance role: S3 images bucket only; S3 images: no public access |
| SECURITY-07: Data Exposure | Compliant | S3 images bucket: public access blocked; OAC on FE S3 bucket |
| SECURITY-08: Secrets | Compliant | No hardcoded credentials; `GOOGLE_CLIENT_ID`, `AWS_*`, `S3_IMAGES_BUCKET` all via env vars |
| SECURITY-09: Dependencies | N/A | Lock file / audit enforcement is CI/CD stage — not Application Design |
| SECURITY-10: Supply Chain | N/A | Dockerfile base image pinning — Code Generation stage |
| SECURITY-11: Session Management | Compliant | 30-day server-side expiry; DB lookup on every request; no cookies |
| SECURITY-12: Token Storage | Compliant | Session tokens in `localStorage` per NFR-01; injected as `Authorization: Bearer` header |
| SECURITY-13: CORS | Compliant | `FRONTEND_URL` env var added to `allowedOrigins` explicit allowlist in `app.js` |
| SECURITY-14: Error Handling | Compliant | Auth failures return generic 401; Google API errors return 500 (no credential value in response) |
| SECURITY-15: PII | Compliant | `google_sub` (opaque Google UID) as primary key; email stored but never logged |
