# Units of Work

## Decomposition Strategy

The system is decomposed into **4 sequential units**, each independently completeable through the full Construction loop (Functional Design → NFR Requirements → NFR Design → Infrastructure Design → Code Generation). Units are ordered by dependency: each unit's output is required by the next.

---

## Unit 1: Backend Authentication

**Type**: Module within existing `api` service
**Owner**: Backend
**Risk**: HIGH — security-critical; auth contract must be stable before FE unit begins

### Scope

All server-side authentication infrastructure: DB schema, migration, Google OAuth endpoint, session middleware, and S3 image storage service.

### Files to Create

| File                                    | Purpose                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `api/src/db/schema_auth.sql`            | `users` + `sessions` tables                                        |
| `api/src/routes/auth.routes.js`         | `POST /auth/google` route handler                                  |
| `api/src/services/googleAuthService.js` | `verifyGoogleToken`, `upsertTenant`, `upsertUser`, `createSession` |
| `api/src/middleware/auth.middleware.js` | `authenticate()` — DB session lookup + API_KEY shortcut            |
| `api/src/services/s3Service.js`         | `uploadToS3`, `getS3Key`                                           |

### Files to Modify

| File                     | Change                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `api/src/app.js`         | Mount `AuthRouter`; import `AuthMiddleware`; add `FRONTEND_URL` to CORS; wire `S3Service` into `POST /reports`         |
| `api/scripts/migrate.sh` | Add `schema_auth.sql` as 3rd file                                                                                      |
| `api/docker-compose.yml` | Mount `schema_auth.sql` as `03_schema_auth.sql` in db init                                                             |
| `api/package.json`       | Add `google-auth-library`, `@aws-sdk/client-s3`                                                                        |
| `api/.env.example`       | Add `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `S3_IMAGES_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `api/Dockerfile`         | Pin `node:20-alpine` to specific digest (NFR-06)                                                                       |

### Acceptance Criteria

- `POST /auth/google` with a valid Google credential returns `{ token, user }`
- `POST /auth/google` with missing credential returns `400`
- Protected routes return `401` without valid session token
- `API_KEY` env-var shortcut still returns `200` on protected routes
- Session token validated via DB lookup on every protected request
- Images uploaded via `POST /reports` are stored in S3; S3 key persisted in DB

### Dependencies

- Requires: Nothing (first unit)
- Blocks: Unit 2 (FE Auth needs stable `POST /auth/google` contract)

---

## Unit 2: Frontend Authentication

**Type**: Modules within existing `ui` workspace
**Owner**: Frontend
**Risk**: HIGH — replaces entire auth UI and token injection mechanism

### Scope

All client-side authentication: `@app/auth` package rewrite, Google button UI, `apiClient` token injection, `GoogleOAuthProvider` shell wrapper.

### Files to Create

| File                                             | Purpose                                              |
| ------------------------------------------------ | ---------------------------------------------------- |
| `ui/packages/@app/auth/src/googleAuthService.ts` | `loginWithGoogleCredential(credential)` — POST to BE |

### Files to Modify

| File                                         | Change                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `ui/packages/@app/auth/src/tokenStorage.ts`  | Add `getToken`, `setToken`, `clearAll`                                   |
| `ui/packages/@app/auth/src/types.ts`         | Add `name` to `User`; add `GoogleAuthResponse`; soft-deprecate old types |
| `ui/packages/@app/auth/src/AuthService.ts`   | Add `loginWithGoogle`; soft-deprecate email/password methods             |
| `ui/packages/@app/auth/src/AuthContext.tsx`  | Replace `login` with `loginWithGoogle`                                   |
| `ui/packages/@app/auth/src/AuthProvider.tsx` | Token injection; session restore on mount; 401 handler wiring            |
| `ui/packages/@app/auth/src/index.ts`         | Export new types + `loginWithGoogle`                                     |
| `ui/apps/mfe-auth/src/pages/LoginPage.tsx`   | Replace Formik form with `<GoogleLogin>`                                 |
| `ui/apps/mfe-auth/package.json`              | Add `@react-oauth/google`                                                |
| `ui/apps/mfe-auth/webpack.config.js`         | Add `GOOGLE_CLIENT_ID` to `DefinePlugin`                                 |
| `ui/apps/shell/src/App.tsx`                  | Add `GoogleOAuthProvider` wrapper                                        |
| `ui/apps/shell/webpack.config.js`            | Add `GOOGLE_CLIENT_ID` to `DefinePlugin`                                 |
| `ui/.env.example`                            | Add `GOOGLE_CLIENT_ID`                                                   |

### Files to Remove Routes From (Q7=B — routes removed, files kept)

| File                                  | Change                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `ui/apps/mfe-auth/src/` router/config | Remove routes for Register, ForgotPassword, ResetPassword pages |

### Acceptance Criteria

- Google Sign-In button renders on `/auth/login`
- Successful Google login → `app.token` + `app.user` in localStorage → navigate to `/projects`
- Page reload → session restored → stays on `/projects` (not redirected to login)
- Logout → localStorage cleared → `Authorization` header removed → redirected to `/auth/login`
- Any `401` response from API → automatic logout triggered
- `pnpm build` succeeds across all apps with `GOOGLE_CLIENT_ID` set

### Dependencies

- Requires: Unit 1 (stable `POST /auth/google` contract)
- Blocks: Unit 3 (local stack needs working FE build)

---

## Unit 3: Local Development Stack

**Type**: New infrastructure files at monorepo root
**Owner**: DevOps / Developer Experience
**Risk**: MEDIUM — validates Units 1+2 end-to-end; no new business logic

### Scope

Single-command local testing: `docker compose -f docker-compose.local.yml up --build` starts the full stack accessible at `http://localhost:8080`.

### Files to Create

| File                               | Purpose                                             |
| ---------------------------------- | --------------------------------------------------- |
| `o_daria/docker-compose.local.yml` | Orchestrates db, ollama, api, nginx services        |
| `ui/Dockerfile.local`              | Multi-stage: pnpm build → nginx static serve        |
| `ui/infra/nginx/nginx.local.conf`  | MFE path routing + `/api/` proxy + security headers |
| `o_daria/.env.local.example`       | Documents env vars needed for local run             |

### Acceptance Criteria

- `docker compose -f docker-compose.local.yml up --build` completes without errors
- `http://localhost:8080` loads the shell app
- `/auth/login` shows Google Sign-In button
- Google login flow completes end-to-end → redirects to `/projects`
- `curl http://localhost:8080/api/health` returns `{ "ok": true }`
- `curl -H "Authorization: Bearer <API_KEY>" http://localhost:8080/api/projects` returns `200`

### Dependencies

- Requires: Units 1 + 2 (FE build must succeed; BE auth must work)
- Blocks: Unit 4 (confirms the stack works before provisioning AWS)

---

## Unit 4: AWS Infrastructure

**Type**: New Terraform root + migrated FE modules + new BE/storage modules
**Owner**: Infrastructure / DevOps
**Risk**: MEDIUM — net-new IaC; no live production state to break

### Scope

Unified Terraform covering the full production stack: FE (CloudFront + S3), BE (EC2 t4g.nano + Docker), storage (S3 images bucket), IAM, and CI/CD updates.

### Files to Create

| File                                            | Purpose                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| `o_daria/infra/terraform/main.tf`               | Root orchestration + S3 backend                        |
| `o_daria/infra/terraform/variables.tf`          | All input variables                                    |
| `o_daria/infra/terraform/outputs.tf`            | CloudFront domain, S3 bucket, EC2 IP                   |
| `o_daria/infra/terraform/terraform.tfvars.prod` | Production values template                             |
| `o_daria/infra/terraform/modules/s3-hosting/`   | Migrated from `ui/infra/terraform/modules/s3-hosting/` |
| `o_daria/infra/terraform/modules/cloudfront/`   | Migrated + CSP updated for Google origins              |
| `o_daria/infra/terraform/modules/iam-deploy/`   | Migrated + extended for images bucket                  |
| `o_daria/infra/terraform/modules/s3-images/`    | New: private S3 bucket for profile images              |
| `o_daria/infra/terraform/modules/ec2-be/`       | New: EC2 t4g.nano + security group + IAM instance role |

### Files to Modify

| File                              | Change                                                               |
| --------------------------------- | -------------------------------------------------------------------- |
| `ui/.github/workflows/deploy.yml` | Add `GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}` to build env |

### Acceptance Criteria

- `terraform plan` produces no errors against a fresh AWS account
- `terraform apply` provisions: 1 CloudFront distribution, 1 FE S3 bucket, 1 images S3 bucket, 1 EC2 t4g.nano instance, 1 IAM deploy user, 1 EC2 IAM instance role
- EC2 instance has Docker installed via `user_data`; BE Docker Compose runs on startup
- CloudFront domain loads the shell app
- FE build in `deploy.yml` passes `GOOGLE_CLIENT_ID` at build time
- Images S3 bucket: public access blocked; only EC2 instance role can read/write
- IAM deploy user: only S3 sync + CloudFront invalidation permissions

### Dependencies

- Requires: Unit 3 (confirms local stack before provisioning production)
- Blocks: Nothing (final unit)

---

## Summary

| Unit           | Key Deliverable                                       | Risk   | Blocked By |
| -------------- | ----------------------------------------------------- | ------ | ---------- |
| 1: BE Auth     | `POST /auth/google` + session middleware + S3 service | HIGH   | —          |
| 2: FE Auth     | Google login UI + token injection + session restore   | HIGH   | Unit 1     |
| 3: Local Stack | `docker compose up` → `localhost:8080` working        | MEDIUM | Units 1+2  |
| 4: AWS Infra   | Unified Terraform — full production stack             | MEDIUM | Unit 3     |
