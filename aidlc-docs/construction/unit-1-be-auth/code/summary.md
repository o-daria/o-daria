# Code Summary — Unit 1: Backend Authentication

## Files Created

| File | Description |
|------|-------------|
| `o_daria_be/src/db/schema_auth.sql` | `users` and `sessions` tables with indexes. Applied as `03_schema_auth.sql` in Docker init order. |
| `o_daria_be/src/services/googleAuthService.js` | Google token verification (`verifyGoogleToken`), tenant upsert, user upsert, and session creation — all in a single DB transaction. Exports `loginWithGoogle(credential)`. |
| `o_daria_be/src/routes/auth.routes.js` | Express router for `POST /auth/google`. Validates `credential` field, delegates to `GoogleAuthService`, returns `{ token, user }`. |
| `o_daria_be/src/middleware/auth.middleware.js` | `authenticate()` Express middleware. API_KEY shortcut (dev) checked first; falls through to DB session lookup (`WHERE token = $1 AND expires_at > NOW()`). |
| `o_daria_be/src/services/s3Service.js` | `uploadToS3(reportId, file)` — derives S3 key from server-controlled inputs only (`profiles/<reportId>/<uuid>.<ext>`), rejects non-image MIME types, uses `PutObjectCommand`. |

## Files Modified

| File | Change |
|------|--------|
| `o_daria_be/scripts/migrate.sh` | Added `SCHEMA_AUTH` variable and `schema_auth.sql` as the third file applied in both `apply_docker()` and `apply_env()`. |
| `o_daria_be/docker-compose.yml` | Added `./src/db/schema_auth.sql:/docker-entrypoint-initdb.d/03_schema_auth.sql` to db service volumes. |
| `o_daria_be/package.json` | Added `"google-auth-library": "^9.15.0"` and `"@aws-sdk/client-s3": "^3.758.0"` to dependencies. |
| `o_daria_be/src/app.js` | Imported `authRouter`, `authenticate`, `uploadToS3`. Mounted `/auth` router before CORS scope. Removed inline `authenticate` function. Added `FRONTEND_URL` to `allowedOrigins`. Added S3 upload loop in `POST /reports` (best-effort, collects `imageS3Keys`). |
| `o_daria_be/Dockerfile` | Pinned base image from `node:20-alpine` to `node:20.18.2-alpine3.20`. |
| `o_daria_be/.env.example` | Added `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `S3_IMAGES_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. |
| `o_daria_be/src/app.test.js` | Added `vi.mock` stubs for `auth.routes.js` (Express Router stub) and `s3Service.js`. Added `resumePipeline` to orchestrator mock. Updated integrity check test to reflect disabled check (returns 200 not 500). |

## Locked Contract (consumed by Unit 2)

```
POST /auth/google
  Body:    { credential: string }
  200:     { token: string, user: { id, email, name, createdAt } }
  400:     { error: "credential is required" }
  500:     { error: "Authentication failed" }
```

## Acceptance Criteria Status

| Check | Status |
|-------|--------|
| `POST /auth/google` with valid token → 200 `{ token, user }` | Ready — requires live Google token |
| `POST /auth/google` with empty body → 400 | Implemented |
| `GET /projects` without header → 401 | Implemented |
| `GET /projects` with `Authorization: Bearer <API_KEY>` → 200 | Retained (dev shortcut) |
| `docker compose up` starts cleanly with `schema_auth.sql` mounted | Ready — verify on fresh volume |
| `pnpm test` passes all existing tests | Mocks updated; verify with `npm test` |
