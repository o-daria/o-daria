# Tech Stack Decisions — Unit 1: Backend Authentication

## New Dependencies

| Package | Version | Purpose | Decision Rationale |
|---------|---------|---------|-------------------|
| `google-auth-library` | `^9.x` | Google ID token verification | Official Google library; `OAuth2Client.verifyIdToken()` is the only supported server-side verification method |
| `@aws-sdk/client-s3` | `^3.x` | S3 image upload | AWS SDK v3 modular — tree-shakeable; smaller bundle than v2; `PutObjectCommand` only |

## Retained Dependencies (no change)

| Package | Purpose | Notes |
|---------|---------|-------|
| `pg` | PostgreSQL client | Existing pool in `db/client.js` — reused by `googleAuthService.js` and `auth.middleware.js` |
| `crypto` | Session token generation | Node.js built-in — `randomBytes(32)` |
| `uuid` | UUID generation | Already in `dependencies` — used for tenant/user IDs |
| `express` | HTTP framework | Existing — `AuthRouter` uses `express.Router()` |
| `multer` | File upload | Existing — `memoryStorage` retained; S3 upload added after multer processing |
| `vitest` | Test runner | Existing — no new framework |

## File Structure Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth route location | `src/routes/auth.routes.js` | Consistent with existing `src/routes/canva.routes.js` pattern |
| Auth service location | `src/services/googleAuthService.js` | Follows existing services directory (no existing services yet — establishing pattern) |
| Auth middleware location | `src/middleware/auth.middleware.js` | Consistent with `src/middleware/canvaToken.middleware.js` |
| S3 service location | `src/services/s3Service.js` | Co-located with `googleAuthService.js` — same service layer |
| Schema file location | `src/db/schema_auth.sql` | Co-located with existing `schema.sql` and `schema_runtime.sql` |

## No New Frameworks Introduced

- No authentication framework (Passport, Auth0 SDK, Clerk) — self-contained implementation per requirements
- No ORM — raw `pg` queries consistent with existing codebase
- No caching layer — DB session lookup is sufficient for 1-user scale
- No queue/worker — S3 uploads are synchronous within the request handler (20MB max, acceptable latency)
