# Component Dependency Map

## Dependency Matrix

| Component | Depends On | Depended On By |
|-----------|-----------|----------------|
| `AuthRouter` | `GoogleAuthService`, `db/client` | `app.js` |
| `GoogleAuthService` | `google-auth-library`, `crypto`, `db/client` | `AuthRouter` |
| `AuthMiddleware` | `db/client` | `app.js` (all protected routes) |
| `S3Service` | `@aws-sdk/client-s3`, `path`, `crypto` | `app.js` POST /reports handler |
| `app.js` | `AuthRouter`, `AuthMiddleware`, `S3Service`, all existing routers | — (entry point) |
| `googleAuthService.ts` | `@app/api-client` (authHttp) | `AuthService.ts` |
| `AuthService.ts` | `googleAuthService.ts` | `AuthProvider.tsx` |
| `tokenStorage.ts` | `localStorage` (browser API) | `AuthProvider.tsx` |
| `AuthContext.tsx` | React | `AuthProvider.tsx`, `useAuth.ts` |
| `AuthProvider.tsx` | `AuthService`, `tokenStorage`, `@app/api-client` (`apiClient`, `registerUnauthorizedHandler`), React Router | `App.tsx` (shell) |
| `LoginPage.tsx` | `@react-oauth/google`, `@app/auth` (`useAuth`) | `mfe-auth` router |
| `App.tsx` (shell) | `@react-oauth/google` (`GoogleOAuthProvider`), `@app/auth` (`AuthProvider`) | — (shell root) |
| `docker-compose.local.yml` | `Dockerfile.local`, `nginx.local.conf`, BE image, db image, ollama image | — |
| `Dockerfile.local` | pnpm workspace, nginx base image | `docker-compose.local.yml` |
| `nginx.local.conf` | — | `Dockerfile.local` |
| Root Terraform (`o_daria/infra/terraform/`) | AWS provider; migrated FE modules + new EC2/S3-images modules | `deploy.yml` (reads outputs) |
| `deploy.yml` | Terraform outputs (`CF_DIST_ID`, bucket name); new `GOOGLE_CLIENT_ID` secret | — |

---

## Communication Patterns

### BE: In-Process Calls (no HTTP)
- `app.js` → `AuthMiddleware.authenticate` — Express middleware chain
- `AuthRouter` → `GoogleAuthService.*` — direct function calls within same process
- `app.js` POST /reports → `S3Service.*` — direct function calls within same process

### BE → External Services (HTTP / SDK)
- `GoogleAuthService.verifyGoogleToken` → Google OAuth2 API (`oauth2.googleapis.com`) — HTTPS
- `S3Service.uploadToS3` → AWS S3 (`s3.amazonaws.com`) — AWS SDK (HTTPS)
- All BE routes → PostgreSQL — TCP via `pg` pool

### FE → BE (HTTP)
- `googleAuthService.ts` → `POST /auth/google` — axios, no auth header (unauthenticated endpoint)
- All other FE API calls → `apiClient` → BE — axios with `Authorization: Bearer <token>` injected by `AuthProvider`

### FE: Module Federation (runtime chunk loading)
- `shell` loads `mfe-auth` remote at `/mfe-auth/remoteEntry.js`
- `@app/auth` shared singleton — instantiated once in shell, consumed by all MFEs
- `@app/api-client` shared singleton — `apiClient` instance is the same object across all remotes
- `@react-oauth/google` — lives in shell and `mfe-auth` standalone; NOT shared via Module Federation (Google's library is not safe to singleton-share)

### Docker (local dev): Container Networking
```
nginx:8080 (FE static)
  └── /api/*  → proxy → api:3300 (BE Express)
                          └── db:5432 (PostgreSQL)
                          └── ollama:11434 (local embeddings)
```

---

## Data Flow Diagrams

### Auth Flow (Login)

```
Browser
  └─[Google Popup]─> Google OAuth (external)
  └─[credential]──> LoginPage.onSuccess
                      └─[credential]──> AuthProvider.loginWithGoogle
                                          └─[POST /auth/google]──> BE AuthRouter
                                                                      └─[verify]──> Google API
                                                                      └─[upsert]──> PostgreSQL
                                                                   { token, user }
                                          └─[token]──> tokenStorage (localStorage)
                                          └─[Bearer token]──> apiClient headers
                      └─[navigate]──> /projects
```

### Auth Flow (Session Restore on Page Load)

```
Browser reload
  └─[mount]──> AuthProvider useEffect
                └─[getToken()]──> localStorage → token
                └─[getUser()]──>  localStorage → user
                └─[if both present]──> apiClient headers['Authorization'] = Bearer token
                                   ──> setUser(user) → isAuthenticated = true
```

### Protected API Call Flow

```
FE component
  └─[apiClient.get('/projects')]──> AuthMiddleware.authenticate
                                        └─[DB lookup]──> sessions table
                                        └─[req.tenantId set]──> route handler
                                                                  └─[query filtered by tenantId]──> result
```

### S3 Image Upload Flow

```
POST /reports (multipart)
  └─[multer]──> req.files (in-memory buffers)
  └─[for each file]──> S3Service.getS3Key(reportId, filename) → sanitized key
                    ──> S3Service.uploadToS3(buffer, key, mimeType) → S3
  └─[INSERT report]──> reports.image_s3_keys = [key1, key2, ...]
  └─[pipeline]──> runPipeline({ ..., s3ImageKeys })
```

---

## Critical Coupling Points

| Coupling | Risk | Mitigation |
|----------|------|-----------|
| `tenantId` as TEXT in existing tables vs UUID in `users` | Type mismatch at runtime | `AuthMiddleware` uses `.toString()` on UUID before assigning to `req.tenantId` |
| `@app/auth` singleton via Module Federation | Version drift if remotes load different versions | pnpm workspace pins single version; `shared: { singleton: true }` in webpack configs |
| `apiClient` headers mutated by `AuthProvider` | Race condition if apiClient used before mount | Mount effect runs synchronously before any API calls; `isLoading=true` guards render |
| `GoogleOAuthProvider` in shell, `<GoogleLogin>` in `mfe-auth` | Shell must load before mfe-auth can use Google context | Module Federation host (shell) always loads first — by design |
| `GOOGLE_CLIENT_ID` baked at build time via `DefinePlugin` | Wrong ID breaks all Google auth | Single source of truth: env var at build time; same var used in shell and mfe-auth webpack configs |
