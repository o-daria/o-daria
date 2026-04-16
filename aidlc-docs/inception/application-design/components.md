# Components

## BE — New Components

### 1. `AuthRouter` (`src/routes/auth.routes.js`)
**Purpose**: Express router handling all `/auth/*` HTTP endpoints.
**Responsibilities**:
- Expose `POST /auth/google` — accepts Google credential, delegates to `GoogleAuthService`, returns session token
- Mount at `/auth` in `app.js` (before the `authenticate` middleware scope)

### 2. `GoogleAuthService` (`src/services/googleAuthService.js`)
**Purpose**: Encapsulates all Google OAuth 2.0 token validation and user lifecycle logic.
**Responsibilities**:
- Verify Google ID tokens via `google-auth-library` `OAuth2Client.verifyIdToken()`
- Upsert tenant on first login (auto-create from email domain)
- Upsert user record linked to `google_sub`
- Issue and persist session tokens (`crypto.randomBytes(32)`)
- Expose individually testable, side-effect-free functions

### 3. `AuthMiddleware` (`src/middleware/auth.middleware.js`)
**Purpose**: Express middleware replacing the inline `authenticate()` function in `app.js`.
**Responsibilities**:
- Extract Bearer token from `Authorization` header
- Support `API_KEY` env-var shortcut (dev backward-compat)
- Validate session via DB lookup: `WHERE token = $1 AND expires_at > NOW()`
- Attach `req.tenantId` (as string, for TEXT-column compat with existing tables)
- Return 401 on missing/invalid/expired tokens — never log token values

### 4. `S3Service` (`src/services/s3Service.js`)
**Purpose**: Thin wrapper around AWS S3 SDK for profile image storage.
**Responsibilities**:
- Initialize `S3Client` from env vars (`AWS_REGION`, `S3_IMAGES_BUCKET`)
- Expose `uploadToS3(buffer, key, mimeType)` — uploads image buffer, returns S3 key
- Expose `getS3Key(reportId, filename)` — derives a deterministic, sanitized S3 key from validated inputs (no raw user strings)
- No pre-signed URL generation required for this release

---

## BE — Modified Components

### 5. `app.js` (modified)
**Purpose**: Express entry point — reduced to route mounting + CORS.
**Changes**:
- Remove inline `authenticate()` function → import `AuthMiddleware`
- Mount `AuthRouter` at `/auth` (unauthenticated — before `authenticate` scope)
- Add `process.env.FRONTEND_URL` to `allowedOrigins` array
- Pass `authenticate` from `AuthMiddleware` to all protected routes

### 6. `POST /reports` handler in `app.js` (modified)
**Purpose**: Accept image uploads and store to S3 instead of discarding after pipeline.
**Changes**:
- After `multer` receives files, call `S3Service.uploadToS3()` per file
- Store returned S3 key alongside report record (new `image_s3_keys` column or JSONB field)
- Pass S3 keys to pipeline params for downstream Canva job use

---

## FE — New Components

### 7. `googleAuthService` (`packages/@app/auth/src/googleAuthService.ts`)
**Purpose**: HTTP client function calling `POST /auth/google` on the BE.
**Responsibilities**:
- Accept Google `credential` string
- POST to `/auth/google` via `authHttp` axios instance
- Return `GoogleAuthResponse { token, user }`
- Not responsible for token storage or navigation (separation of concerns)

---

## FE — Modified Components

### 8. `tokenStorage` (`packages/@app/auth/src/tokenStorage.ts`) (modified)
**Purpose**: localStorage persistence for both session token and user object.
**Changes**:
- Add `TOKEN_KEY = 'app.token'`
- Add `getToken(): string | null`
- Add `setToken(token: string): void`
- Extend `clearUser()` → rename to `clearAll()` (clears both token and user)

### 9. `AuthService` (`packages/@app/auth/src/AuthService.ts`) (modified)
**Purpose**: Public auth API consumed by `AuthProvider` and other MFEs.
**Changes**:
- Replace all email/password methods with `loginWithGoogle(credential: string): Promise<GoogleAuthResponse>`
- Keep `logout(): Promise<void>` (client-side only — no server call needed)
- Deprecated email/password methods kept as `@deprecated` JSDoc stubs (soft remove, Q5=B)

### 10. `AuthContext` (`packages/@app/auth/src/AuthContext.tsx`) (modified)
**Purpose**: React context shape for auth state.
**Changes**:
- Replace `login: (payload: LoginRequest) => Promise<void>` with `loginWithGoogle: (credential: string) => Promise<void>`
- Keep `logout`, `user`, `isAuthenticated`, `isLoading`

### 11. `AuthProvider` (`packages/@app/auth/src/AuthProvider.tsx`) (modified)
**Purpose**: React provider — owns auth state, token injection, session restore.
**Changes**:
- On mount: restore both `token` and `user` from `tokenStorage`; re-attach `Authorization: Bearer <token>` to `apiClient.defaults.headers.common`
- `loginWithGoogle(credential)`: call `AuthService.loginWithGoogle()` → persist token+user → inject into `apiClient` → navigate to `/projects`
- `logout()`: clear `tokenStorage.clearAll()` → delete `apiClient.defaults.headers.common['Authorization']` → navigate to `/auth/login`
- Register `registerUnauthorizedHandler` (from `@app/api-client`) to call `logout()` on 401

### 12. `LoginPage` (`apps/mfe-auth/src/pages/LoginPage.tsx`) (modified)
**Purpose**: Auth UI — replace email/password form with Google Sign-In button.
**Changes**:
- Remove Formik form, email/password inputs, validation
- Render `<GoogleLogin onSuccess={...} onError={...} />` from `@react-oauth/google`
- Keep brand mark and Card wrapper for visual continuity
- `onSuccess`: calls `loginWithGoogle(credentialResponse.credential)`

### 13. `App.tsx` (shell) (`apps/shell/src/App.tsx`) (modified)
**Purpose**: Shell root — adds `GoogleOAuthProvider` wrapper.
**Changes**:
- Wrap existing component tree with `<GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID ?? ''}>`
- `GoogleOAuthProvider` must live in shell (Module Federation host) — not in `mfe-auth` — because `@app/auth` is a singleton shared module

---

## Infrastructure — New Components

### 14. `docker-compose.local.yml` (monorepo root)
**Purpose**: Single-command local full-stack preview.
**Responsibilities**:
- Orchestrate: `db` (PostgreSQL + pgvector), `ollama`, `api` (BE), `nginx` (FE static + API proxy)
- Pass build args to `nginx` service: `GOOGLE_CLIENT_ID`, `VITE_API_BASE_URL=/api`, `VITE_MFE_*_URL` paths

### 15. `Dockerfile.local` (`o_daria_ui/Dockerfile.local`)
**Purpose**: Multi-stage build — pnpm install → build all MFEs → nginx serve.
**Responsibilities**:
- Stage 1 (builder): install deps with `--frozen-lockfile`, run `pnpm build` for all apps
- Stage 2 (nginx): copy dist files to correct nginx subdirectory paths

### 16. `nginx.local.conf` (`o_daria_ui/infra/nginx/nginx.local.conf`)
**Purpose**: nginx routing for local stack — mirrors CloudFront path behaviors.
**Responsibilities**:
- Serve shell at `/`
- Serve each MFE at `/mfe-*/` with `try_files` SPA fallback
- Proxy `/api/` → `http://api:3300/`
- Set security headers (CSP, HSTS, X-Frame-Options, etc.)

---

## Infrastructure — New Root Terraform

### 17. Root Terraform (`o_daria/infra/terraform/`)
**Purpose**: New unified IaC covering the entire stack — FE (CloudFront + S3) + BE (EC2 + Docker) + DB (RDS or managed Postgres) + S3 images bucket.
**Rationale**: Moving from `o_daria_ui/infra/terraform/` to monorepo root. The existing FE-only Terraform modules are migrated here. New modules added for BE infrastructure.
**Structure**:
- `main.tf` — root orchestration, S3 backend, provider
- `modules/s3-hosting/` — migrated from existing FE Terraform (single S3 bucket for all MFEs)
- `modules/cloudfront/` — migrated from existing FE Terraform; update CSP to allow Google Sign-In origins
- `modules/iam-deploy/` — migrated from existing; extend to cover new images bucket
- `modules/s3-images/` — NEW: private S3 bucket for profile images; BE IAM role access only
- `modules/ec2-be/` — NEW: EC2 t4g.nano with Docker, security group (ports 22, 3300), IAM instance role for S3 images access
- `variables.tf`, `outputs.tf`, `terraform.tfvars.prod`

**State backend**: Reuse existing `s3://o-daria-ui-tfstate` bucket, new key `prod/infra/terraform.tfstate`

### 18. `deploy.yml` (`o_daria_ui/.github/workflows/deploy.yml`)
**Purpose**: CI/CD — add `GOOGLE_CLIENT_ID` to FE build env vars.
**Changes**:
- Add `GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}` to the `Build all packages and apps` step env block
- No S3 sync changes needed (already uses single bucket with prefix paths)
