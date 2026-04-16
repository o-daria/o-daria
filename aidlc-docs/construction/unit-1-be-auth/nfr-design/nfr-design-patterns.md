# NFR Design Patterns — Unit 1: Backend Authentication

## Security Pattern: Defense-in-Depth for Token Handling

**Problem**: Session tokens and Google ID tokens are high-value secrets — exposure compromises all tenant data.

**Pattern applied**:
1. **Never log tokens** — `auth.middleware.js` extracts token but never passes it to any logger
2. **Generic error responses** — auth failures return `401` with generic message; Google API failures return `500` (not `401`) to avoid oracle attacks
3. **Server-side-only verification** — `verifyIdToken()` runs on BE; FE never touches Google token validation
4. **Short-circuit on API_KEY** — dev shortcut checked first, before any DB I/O, keeping the fast path fast

## Security Pattern: DB Transaction Atomicity

**Problem**: A crash between tenant upsert and session insert could leave the system in a partially-created state.

**Pattern applied**: Single `pg` transaction wraps all three writes (tenant upsert → user upsert → session insert). On any error, full rollback — client gets a clean 500 with no partial state in DB.

```
BEGIN
  INSERT INTO tenants ... ON CONFLICT DO NOTHING
  SELECT id FROM tenants WHERE name = $tenantName
  INSERT INTO users ... ON CONFLICT DO UPDATE
  INSERT INTO sessions ...
COMMIT
```

## Security Pattern: Input Sanitization at Boundary

**Problem**: S3 keys constructed from user data could enable path traversal or key injection.

**Pattern applied**: S3 keys are fully derived from server-controlled data:
- `reportId` = server-generated UUID (validated before reaching S3Service)
- file portion = `crypto.randomUUID()` — no user input
- extension = `path.extname(originalname)` — only the suffix, no directory separators

## Reliability Pattern: Fail-Fast on Missing Config

**Problem**: Silent misconfiguration (missing `S3_IMAGES_BUCKET`, `GOOGLE_CLIENT_ID`) causes confusing runtime errors.

**Pattern applied**: Both env vars checked at module load time:
```javascript
// googleAuthService.js
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID env var is required');

// s3Service.js  
const BUCKET = process.env.S3_IMAGES_BUCKET;
if (!BUCKET) throw new Error('S3_IMAGES_BUCKET env var is required');
```
Server won't start without required config — surfaces misconfiguration immediately.

## Reliability Pattern: Partial S3 Upload Tolerance

**Problem**: S3 upload failure for one image should not block the entire report.

**Pattern applied**: Upload loop continues on per-file error; errors are logged (without PII); only successfully uploaded keys are stored. The downstream pipeline already handles cases where `uploadedFiles` is an empty array — this extends that tolerance to partial S3 failures.

## Performance Pattern: Indexed Session Lookup

**Problem**: Every authenticated request hits the DB — must be fast.

**Pattern applied**:
- `sessions` table has `token TEXT PRIMARY KEY` — primary key lookup is O(1) / B-tree index
- `expires_at > NOW()` filter uses `sessions_expires_idx` covering index
- Single-row result — no cursor, no pagination overhead
- Existing `pg` connection pool handles concurrent requests without connection overhead
