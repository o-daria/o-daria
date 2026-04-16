# Unit of Work — Dependency Matrix

## Inter-Unit Dependencies

| Unit | Depends On | Dependency Type | Reason |
|------|-----------|----------------|--------|
| Unit 1: BE Auth | — | None | First unit; no upstream dependencies |
| Unit 2: FE Auth | Unit 1 | Hard — API contract | `loginWithGoogleCredential` POSTs to `POST /auth/google`; endpoint must exist and be stable |
| Unit 3: Local Stack | Unit 1, Unit 2 | Hard — runtime | `docker-compose.local.yml` builds FE (Unit 2) and BE (Unit 1); both must compile and run |
| Unit 4: AWS Infra | Unit 3 | Soft — validation | Terraform provisions the production stack; local stack validates the architecture first |

## Dependency Graph

```
Unit 1: BE Auth
    |
    v (API contract stable)
Unit 2: FE Auth
    |
    v (FE build succeeds + BE auth works)
Unit 3: Local Stack  <-- validates Units 1+2 end-to-end
    |
    v (architecture verified)
Unit 4: AWS Infra
```

## Shared Interfaces (Cross-Unit Contracts)

### Contract: `POST /auth/google`
- **Defined by**: Unit 1 (BE Auth)
- **Consumed by**: Unit 2 (FE Auth) via `googleAuthService.ts`
- **Contract**:
  - Request: `POST /auth/google` with body `{ credential: string }`
  - Response 200: `{ token: string, user: { id: string, email: string, name: string, createdAt: string } }`
  - Response 400: `{ error: "credential is required" }`
  - Response 500: `{ error: "Authentication failed" }`
- **Lock point**: Unit 1 Code Generation must finalize this contract before Unit 2 begins

### Contract: `Authorization: Bearer <token>` header
- **Defined by**: Unit 1 (`AuthMiddleware`)
- **Produced by**: Unit 2 (`AuthProvider` injects into `apiClient`)
- **Consumed by**: All protected BE routes via `AuthMiddleware`
- **Contract**: Any request with a valid unexpired session token → `req.tenantId` set; `200` response

### Contract: `GOOGLE_CLIENT_ID` env var
- **Set in**: Unit 4 (AWS Infra — build secret in `deploy.yml`); Unit 3 (local `.env.local`)
- **Consumed by**: Unit 2 (shell `App.tsx` `GoogleOAuthProvider` + webpack `DefinePlugin`)
- **Note**: Must be the same Google OAuth 2.0 client ID used by the BE for token verification

### Contract: S3 Images Bucket
- **Defined by**: Unit 4 (Terraform `s3-images` module)
- **Consumed by**: Unit 1 (`S3Service` reads `S3_IMAGES_BUCKET` env var)
- **Note**: For local dev (Unit 3), this can be a LocalStack S3 endpoint or a real dev bucket

## File-Level Dependency Matrix

| File | Modified In | Read/Used By |
|------|------------|-------------|
| `schema_auth.sql` | Unit 1 | Unit 1 (migrate.sh), Unit 3 (docker-compose.local.yml db init) |
| `auth.routes.js` | Unit 1 | Unit 1 (app.js mount) |
| `googleAuthService.js` | Unit 1 | Unit 1 (auth.routes.js) |
| `auth.middleware.js` | Unit 1 | Unit 1 (app.js), all protected routes |
| `s3Service.js` | Unit 1 | Unit 1 (app.js POST /reports) |
| `app.js` | Unit 1 | Unit 3 (docker-compose.local.yml api service) |
| `@app/auth` package | Unit 2 | Unit 2 (mfe-auth, shell — via Module Federation) |
| `googleAuthService.ts` | Unit 2 | Unit 2 (AuthService.ts) |
| `tokenStorage.ts` | Unit 2 | Unit 2 (AuthProvider.tsx) |
| `AuthProvider.tsx` | Unit 2 | Unit 2 (shell App.tsx) |
| `LoginPage.tsx` | Unit 2 | Unit 2 (mfe-auth router) |
| `App.tsx` (shell) | Unit 2 | Unit 3 (built into nginx static files) |
| `docker-compose.local.yml` | Unit 3 | Unit 3 (developer local run) |
| `Dockerfile.local` | Unit 3 | Unit 3 (docker-compose.local.yml nginx service) |
| `nginx.local.conf` | Unit 3 | Unit 3 (Dockerfile.local) |
| `infra/terraform/` (root) | Unit 4 | Unit 4 (terraform apply) |
| `deploy.yml` | Unit 4 | Unit 4 (GitHub Actions CI/CD) |

## Risk Matrix

| Risk | Affected Units | Mitigation |
|------|---------------|-----------|
| `POST /auth/google` contract change mid-flight | Units 1, 2 | Lock contract at end of Unit 1 Code Generation; document in `unit-of-work.md` |
| `GOOGLE_CLIENT_ID` mismatch between FE and BE | Units 1, 2, 3, 4 | Single env var used in all places; documented in `.env.local.example` and `.env.example` |
| `tenantId` UUID→TEXT cast failure | Unit 1 | `authenticate()` middleware uses `.toString()` explicitly; covered by existing test suite |
| `@app/auth` Module Federation singleton drift | Unit 2 | `pnpm` workspace pins single version; `shared: { singleton: true }` in webpack configs |
| EC2 t4g.nano arm64 Docker image compat | Unit 4 | BE `Dockerfile` must use multi-arch base image (`node:20-alpine` is multi-arch); verified at Unit 1 Code Generation |
| Ollama model pull time on EC2 startup | Unit 4 | `nomic-embed-text` pulled once on EC2 init via `user_data`; mounted as volume for persistence |
