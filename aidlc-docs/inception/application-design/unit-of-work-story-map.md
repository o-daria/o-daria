# Unit of Work — Story Map

Note: Formal User Stories were skipped (per workflow plan — backend/infra-heavy change, single user type). This document maps requirements directly to units, serving the same traceability purpose.

---

## Requirement → Unit Mapping

### FR-01: Google Sign-In Authentication

| Sub-requirement | Unit | Component |
|----------------|------|-----------|
| `POST /auth/google` endpoint | Unit 1: BE Auth | `auth.routes.js`, `googleAuthService.js` |
| Google ID token validation via `google-auth-library` | Unit 1: BE Auth | `googleAuthService.js` |
| Auto-create tenant + user on first login | Unit 1: BE Auth | `googleAuthService.js` |
| Resolve existing user by `google_sub` on re-login | Unit 1: BE Auth | `googleAuthService.js` |
| Session token issued + stored in `sessions` table | Unit 1: BE Auth | `googleAuthService.js`, `schema_auth.sql` |
| `authenticate()` middleware validates via DB lookup | Unit 1: BE Auth | `auth.middleware.js` |
| `API_KEY` dev shortcut retained | Unit 1: BE Auth | `auth.middleware.js` |
| FE `AuthProvider` persists token in localStorage | Unit 2: FE Auth | `tokenStorage.ts`, `AuthProvider.tsx` |
| FE injects `Authorization: Bearer` on all API calls | Unit 2: FE Auth | `AuthProvider.tsx` (apiClient injection) |
| `LoginPage.tsx` replaced with `<GoogleLogin>` button | Unit 2: FE Auth | `LoginPage.tsx` |
| Email/password routes removed | Unit 2: FE Auth | `mfe-auth` router config |

### FR-02: Cloud File Storage for Profile Images

| Sub-requirement | Unit | Component |
|----------------|------|-----------|
| S3 client configured | Unit 1: BE Auth | `s3Service.js` |
| Images uploaded via `POST /reports` stored in S3 | Unit 1: BE Auth | `app.js` (POST /reports handler) |
| S3 bucket provisioned (private, BE-role-only) | Unit 4: AWS Infra | `modules/s3-images/` |
| EC2 IAM instance role with S3 images access | Unit 4: AWS Infra | `modules/ec2-be/` |

### FR-03: Single-Command Local Testing

| Sub-requirement | Unit | Component |
|----------------|------|-----------|
| `docker-compose.local.yml` at monorepo root | Unit 3: Local Stack | `docker-compose.local.yml` |
| Services: db, ollama, api, nginx | Unit 3: Local Stack | `docker-compose.local.yml` |
| nginx serves FE at `/`, MFEs at `/mfe-*/` | Unit 3: Local Stack | `nginx.local.conf` |
| nginx proxies `/api/` to `api:3300` | Unit 3: Local Stack | `nginx.local.conf` |
| FE built during `docker compose up` | Unit 3: Local Stack | `Dockerfile.local` |
| Accessible at `http://localhost:8080` | Unit 3: Local Stack | `docker-compose.local.yml` (port mapping) |

### FR-04: Simplified AWS Deployment

| Sub-requirement | Unit | Component |
|----------------|------|-----------|
| Single CloudFront distribution | Unit 4: AWS Infra | `modules/cloudfront/` (migrated) |
| Single S3 bucket for all FE assets | Unit 4: AWS Infra | `modules/s3-hosting/` (migrated) |
| 403/404 → `/shell/index.html` SPA fallback | Unit 4: AWS Infra | `modules/cloudfront/` custom error responses |
| `deploy.yml` syncs to correct S3 prefix paths | Unit 4: AWS Infra | `deploy.yml` (already correct; add `GOOGLE_CLIENT_ID`) |
| EC2 t4g.nano for BE hosting | Unit 4: AWS Infra | `modules/ec2-be/` |

### FR-05: Database Schema — Auth Tables

| Sub-requirement | Unit | Component |
|----------------|------|-----------|
| `schema_auth.sql` with `users` + `sessions` tables | Unit 1: BE Auth | `schema_auth.sql` |
| `migrate.sh` applies `schema_auth.sql` as 3rd file | Unit 1: BE Auth | `migrate.sh` |
| `docker-compose.yml` mounts `schema_auth.sql` | Unit 1: BE Auth | `docker-compose.yml` |

---

## NFR → Unit Mapping

| NFR | Unit(s) | How Addressed |
|-----|---------|--------------|
| NFR-01: Google token server-side validation | Unit 1 | `googleAuthService.verifyGoogleToken()` on every `POST /auth/google` |
| NFR-01: Session token DB validation on every request | Unit 1 | `auth.middleware.js` DB lookup |
| NFR-01: No tokens in cookies | Unit 2 | `tokenStorage.ts` uses `localStorage`; no cookie logic |
| NFR-02: HTTP security headers | Unit 3 + Unit 4 | `nginx.local.conf` + CloudFront response headers policy |
| NFR-03: IAM least-privilege | Unit 4 | `iam-deploy` module: S3 sync + CF invalidation only; EC2 role: S3 images only |
| NFR-03: S3 images private | Unit 4 | `s3-images` module: public access blocked |
| NFR-04: No PII/token logging | Unit 1 | `auth.middleware.js` never logs token; `googleAuthService.js` logs non-sensitive context only |
| NFR-05: Input validation | Unit 1 | `credential` validated non-empty; S3 keys sanitized |
| NFR-06: Lock files committed | Unit 2 | `pnpm-lock.yaml` committed; `--frozen-lockfile` in `deploy.yml` and `Dockerfile.local` |
| NFR-06: Dockerfile base image pinning | Unit 1 | `o_daria_be/Dockerfile` pinned (e.g., `node:20.18.2-alpine3.20`) |
| NFR-07: Existing tests remain passing | Unit 1 + 2 | `AuthService` soft-deprecates old methods; no breaking interface changes to test consumers |
| NFR-08: Cost efficiency (1 CF, 2 S3) | Unit 4 | Terraform: 1 CF distribution, 1 FE S3 bucket, 1 images S3 bucket |
| NFR-08: Ollama retained | Unit 1 + 3 + 4 | No OpenAI embeddings added; Ollama in local stack and EC2 docker-compose |
| NFR-09: Local dev parity | Unit 3 | `docker-compose.local.yml` nginx mirrors CloudFront path behaviors |

---

## Coverage Summary

| Requirement | Covered By Unit(s) | Status |
|------------|-------------------|--------|
| FR-01 | Units 1, 2 | Fully covered |
| FR-02 | Units 1, 4 | Fully covered |
| FR-03 | Unit 3 | Fully covered |
| FR-04 | Unit 4 | Fully covered |
| FR-05 | Unit 1 | Fully covered |
| NFR-01 through NFR-09 | Units 1–4 | Fully covered |

All 5 functional requirements and 9 non-functional requirements are assigned to at least one unit.
