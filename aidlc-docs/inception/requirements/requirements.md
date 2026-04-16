# Requirements Document

## Intent Analysis Summary

- **User Request**: Take MVP monorepo (api + ui) to production-like state for first customer review
- **Request Type**: Enhancement / Migration — adding Google Auth, simplifying deployment infrastructure, adding cloud file storage, enabling single-command local testing
- **Scope Estimate**: Cross-system — changes span BE (auth, storage), FE (auth UI, build), IaC (Terraform/AWS), and DevOps (Docker, CI/CD)
- **Complexity Estimate**: Complex — multiple concerns (auth, infra, storage, local dev), interdependent changes, security-critical auth flow

---

## Functional Requirements

### FR-01: Google Sign-In Authentication

- The system MUST replace the existing email/password authentication with Google Sign-In (OAuth 2.0 via `@react-oauth/google`)
- The BE MUST expose a `POST /auth/google` endpoint that accepts a Google ID token (`credential`), validates it via `google-auth-library`, and returns a session token
- On first login, the BE MUST auto-create a `tenant` and `user` record linked to the Google account (any Google account permitted)
- On subsequent logins, the BE MUST resolve the existing user/tenant by `google_sub` (Google UID)
- The BE MUST issue a session token (`crypto.randomBytes(32)`) stored in a `sessions` DB table with 30-day expiry
- The FE `AuthProvider` MUST persist the session token in `localStorage` and inject it as `Authorization: Bearer` on all API calls
- The `authenticate()` middleware MUST validate sessions via DB lookup (`WHERE token = $1 AND expires_at > NOW()`)
- The `API_KEY` env-var shortcut MUST be retained for local `curl`/dev testing backward-compatibility
- The existing email/password pages (Register, ForgotPassword, ResetPassword, Login form) MUST be removed from the codebase
- `LoginPage.tsx` MUST be replaced with a Google Sign-In button (`<GoogleLogin>`)

### FR-02: Cloud File Storage for Profile Images

- The system MUST add persistent cloud storage (AWS S3) for Instagram profile images
- Images uploaded via the BE (`POST /reports` with multipart) MUST be stored in S3 instead of in-memory only
- The BE MUST expose a configured S3 client for upload/retrieval operations
- Profile images used during Canva asset upload MUST be retrievable from S3

### FR-03: Single-Command Local Testing

- A `docker-compose.local.yml` at the monorepo root MUST start all services with one command: `docker compose -f docker-compose.local.yml up --build`
- Services included: `db` (PostgreSQL + pgvector), `ollama`, `api` (BE), `nginx` (FE static files + API proxy)
- nginx MUST serve the built FE shell at `/`, MFE remotes at `/mfe-*/`, and proxy `/api/` to `api:3300/`
- The FE MUST be built during `docker compose up` via a multi-stage `Dockerfile.local`
- The setup MUST be accessible at `http://localhost:3000`

### FR-04: Simplified AWS Deployment (1 CloudFront Distribution)

- The existing Terraform MUST be rewritten to use a single CloudFront distribution and a single S3 bucket for all FE assets
- CloudFront path behaviors: `/mfe-auth/*`, `/mfe-projects/*`, `/mfe-reports/*`, `/mfe-canva/*` → respective S3 prefixes; default `/*` → shell root
- A 403/404 CloudFront error page MUST redirect to `/index.html` (SPA fallback)
- The `deploy.yml` GitHub Actions workflow MUST be updated to sync each app's dist to the correct S3 prefix path
- A separate S3 bucket MUST be provisioned for profile image storage (FR-02)

### FR-05: Database Schema — Auth Tables

- A `schema_auth.sql` file MUST be created with `users` and `sessions` tables
- `users`: `id`, `google_sub` (UNIQUE), `email`, `name`, `tenant_id` (UUID FK to `tenants`), `created_at`, `last_login_at`
- `sessions`: `token` (PK), `user_id` (FK), `tenant_id` (UUID), `created_at`, `expires_at` (NOW + 30 days)
- `scripts/migrate.sh` MUST be updated to apply `schema_auth.sql` as the third file
- `docker-compose.yml` MUST mount `schema_auth.sql` in the db container init

---

## Non-Functional Requirements

### NFR-01: Security — Google Token Validation (SECURITY-08, SECURITY-12)

- Google ID tokens MUST be validated server-side using `google-auth-library` `OAuth2Client.verifyIdToken()` on every `/auth/google` request
- Session tokens MUST be validated server-side on every protected request (not just at login)
- Session tokens MUST NOT be stored in cookies — `localStorage` is used, injected as `Authorization: Bearer`
- No hardcoded credentials, API keys, or secrets in source code (SECURITY-12)

### NFR-02: Security — HTTP Headers (SECURITY-04)

- nginx serving the FE MUST set: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- CSP must allow Google Sign-In scripts and the Anthropic/Canva APIs used by the product

### NFR-03: Security — Access Control (SECURITY-06, SECURITY-07)

- AWS IAM roles for GitHub Actions and the BE Lambda/service MUST follow least-privilege (no wildcard `*` actions or resources)
- S3 bucket for profile images MUST have public access blocked; only the BE role may read/write
- S3 bucket for FE assets MUST have public access blocked; CloudFront OAC MUST be the only origin accessor

### NFR-04: Security — Application Logging (SECURITY-03)

- The BE MUST NOT log Google ID tokens, session tokens, or any PII to console/log output
- Structured log entries MUST include: timestamp, request ID, log level, message

### NFR-05: Security — Input Validation (SECURITY-05)

- The `POST /auth/google` endpoint MUST validate that `credential` is a non-empty string before calling Google's verification API
- S3 upload paths MUST be derived from validated/sanitized source (no raw user-controlled strings as S3 keys)

### NFR-06: Security — Supply Chain (SECURITY-10)

- Lock files (`package-lock.json`, `pnpm-lock.yaml`) MUST be committed and used (`--frozen-lockfile`)
- Production Dockerfiles MUST pin base image versions (no `latest` tags)
- Dependency vulnerability scanning (npm audit) is already configured in `pr-checks.yml` — MUST remain

### NFR-07: Test Compatibility

- All existing passing tests MUST remain passing after changes
- No new test framework or test files are required beyond fixing broken tests caused by auth interface changes
- Tests that reference `AuthService.login()`, `LoginRequest`, or the email/password endpoints MUST be updated to use the new Google auth interface

### NFR-08: Cost Efficiency

- The production deployment MUST reduce the number of CloudFront distributions from 5 to 1
- The production deployment MUST reduce the number of S3 buckets from 5 (FE) to 2 (1 FE + 1 for images)
- Ollama local embeddings MUST be retained as default (no OpenAI embeddings in production — cost saving)

### NFR-09: Local Dev Parity

- The local docker-compose stack MUST produce behavior identical to the production AWS deployment
- Environment variable values for MFE URLs in local mode MUST use same-host relative paths (e.g., `/mfe-auth/remoteEntry.js`)

---

## Extension Configuration

| Extension              | Enabled | Decided At            |
| ---------------------- | ------- | --------------------- |
| Security Baseline      | Yes     | Requirements Analysis |
| Property-Based Testing | No      | Requirements Analysis |

---

## Out of Scope

- HMR (hot module reload) dev workflow — the single docker-compose local approach covers the local testing requirement
- Multi-factor authentication — Google Sign-In is the sole auth method
- Session invalidation endpoint — sessions expire naturally after 30 days; no `DELETE /auth/session` required for this release
- Email/password fallback — removed entirely per FR-01
