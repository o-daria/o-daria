# NFR Requirements — Unit 1: Backend Authentication

## Security (SECURITY BASELINE — ENABLED)

| ID     | Requirement                                                                                   | Implementation Target                             |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| SEC-01 | Google ID tokens validated server-side via `google-auth-library` on every `POST /auth/google` | `googleAuthService.verifyGoogleToken()`           |
| SEC-02 | Session tokens validated via DB lookup on every protected request                             | `auth.middleware.js`                              |
| SEC-03 | No session tokens, Google ID tokens, or email addresses in log output                         | All log statements in auth path                   |
| SEC-04 | Structured log entries: timestamp, request ID, log level, message                             | Existing logger pattern (no new framework needed) |
| SEC-05 | `credential` validated as non-empty string before calling Google API                          | Route handler input validation                    |
| SEC-06 | S3 upload keys derived from server-controlled inputs only — no raw user filenames             | `s3Service.getS3Key()`                            |
| SEC-07 | S3 bucket name from env var; fail-fast if absent                                              | `s3Service.js` module init                        |
| SEC-08 | No hardcoded credentials, API keys, or secrets in source code                                 | All new files                                     |
| SEC-09 | `google-auth-library`, `@aws-sdk/client-s3` added to `package.json`; lock file committed      | `package.json`, `package-lock.json`               |
| SEC-10 | `Dockerfile` base image pinned to specific version (no `latest`)                              | `api/Dockerfile`                                  |
| SEC-11 | DB transaction wraps tenant upsert + user upsert + session insert — atomic                    | `googleAuthService.js`                            |
| SEC-12 | `API_KEY` shortcut only active when env var is set; never hardcoded                           | `auth.middleware.js`                              |

## Performance

| Requirement                           | Target            | Notes                                                           |
| ------------------------------------- | ----------------- | --------------------------------------------------------------- |
| `POST /auth/google` response time     | < 2s p99 (1 user) | Google API call is the bottleneck (~300-500ms); DB adds ~5ms    |
| `authenticate()` middleware DB lookup | < 10ms p99        | Single indexed query: `WHERE token = $1 AND expires_at > NOW()` |
| S3 upload per image                   | < 5s per file     | 20MB max; AWS SDK handles retry                                 |

## Reliability

| Requirement                | Detail                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Auth transaction atomicity | Tenant + user + session in single transaction — rollback on any failure                       |
| S3 upload partial failure  | Non-blocking — report created with partial/empty `image_s3_keys`; pipeline handles gracefully |
| DB connection pooling      | Existing `pg` pool in `db/client.js` — no changes needed                                      |

## Maintainability

| Requirement                | Detail                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Testability                | `googleAuthService.js` exports individual functions (not a class) — each independently unit-testable |
| `authenticate()` isolation | Moved to `src/middleware/auth.middleware.js` — consistent with `canvaToken.middleware.js` pattern    |
| No new test framework      | Use existing `vitest` — no changes to `package.json` devDependencies for testing                     |
| Existing tests unbroken    | `API_KEY` shortcut retained; existing `app.test.js` must continue to pass                            |

## Compatibility

| Requirement                   | Detail                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `tenantId` TEXT compat        | `req.tenantId` always set as string via `.toString()` — all existing routes unchanged |
| Existing `docker-compose.yml` | `schema_auth.sql` mounted as `03_schema_auth.sql` — init order preserved              |
| `migrate.sh` idempotency      | `schema_auth.sql` uses `CREATE TABLE IF NOT EXISTS` — safe to re-run                  |
