# Business Rules — Unit 1: Backend Authentication

## BR-AUTH-01: Google Credential Validation

**Rule**: Every `POST /auth/google` request MUST validate the `credential` field before any other processing.
- `credential` must be present in request body
- `credential` must be a non-empty string
- Violation → `400 Bad Request { error: "credential is required" }`
- After format check: verify via `OAuth2Client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })`
- `email_verified` claim in payload must be `true` — reject if false
- Any Google API verification failure → `500 Internal Server Error` (never `401` — avoids leaking whether credential was valid)

## BR-AUTH-02: Tenant Auto-Creation

**Rule**: On first login, a tenant is automatically created. No manual provisioning required.
- Tenant name = email domain extracted from verified email (e.g., `user@example.com` → `"example.com"`)
- Tenant `plan` = `'starter'`
- Uses `INSERT INTO tenants ... ON CONFLICT (id) DO NOTHING` — idempotent
- The dev tenant (`00000000-0000-0000-0000-000000000000`) seed in `schema_runtime.sql` is unaffected

## BR-AUTH-03: User Upsert

**Rule**: User record is created on first login and updated on every subsequent login.
- Lookup by `google_sub` (unique, indexed)
- First login → `INSERT` with `tenant_id`, `email`, `name`, `google_sub`
- Re-login → `UPDATE SET last_login_at = NOW()` via `ON CONFLICT (google_sub) DO UPDATE`
- `tenant_id` is bound to the user at creation and never changes

## BR-AUTH-04: Session Token Issuance

**Rule**: A new session token is issued on every successful login (no token reuse).
- Token = `crypto.randomBytes(32).toString('hex')` — 256-bit entropy, 64-char hex
- `expires_at` = `NOW() + INTERVAL '30 days'`
- Old sessions are not invalidated — they expire naturally (no session limit per user for MVP)
- The entire tenant upsert → user upsert → session insert runs in a single DB transaction — partial state is never committed

## BR-AUTH-05: Session Validation on Every Request

**Rule**: Every protected route MUST validate the session token against the DB on every request.
- Extract `Authorization: Bearer <token>` header
- Missing header → `401 { error: "Missing Authorization header" }`
- Lookup: `SELECT tenant_id FROM sessions WHERE token = $1 AND expires_at > NOW()`
- Not found or expired → `401 { error: "Invalid or expired session" }`
- Found → attach `req.tenantId = row.tenant_id.toString()` (TEXT cast for existing table compat)

## BR-AUTH-06: API_KEY Dev Shortcut

**Rule**: If the incoming token matches `process.env.API_KEY` exactly, bypass DB lookup.
- Only active when `API_KEY` is set in environment
- Attaches `req.tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000000'`
- Used for local `curl` testing and CI scripts only — `API_KEY` is never set in production
- Must be checked BEFORE the DB lookup path (short-circuit)

## BR-AUTH-07: No PII / Token Logging

**Rule**: Session tokens, Google ID tokens, and email addresses MUST NOT appear in any log output.
- Log entries for auth events include only: timestamp, request ID, log level, non-sensitive message
- Example allowed: `[Auth] Google login success — userId: <uuid>`
- Example forbidden: `[Auth] token=abc123...`, `[Auth] email=user@example.com`

## BR-S3-01: S3 Key Derivation

**Rule**: S3 object keys MUST be derived from server-controlled inputs only — never raw user filenames.
- Key format: `profiles/<reportId>/<uuid>.<ext>`
- `reportId` = server-generated UUID (already validated)
- `<uuid>` = new `crypto.randomUUID()` per file — prevents collisions
- `<ext>` = extension extracted via `path.extname(originalname).toLowerCase()` — only `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` accepted
- Unknown/missing extension → use `.bin`
- Reject files where `mimetype` does not start with `image/` (already enforced by multer `fileFilter`, but validated again at S3Service layer)

## BR-S3-02: S3 Upload Atomicity

**Rule**: S3 uploads for a `POST /reports` request are best-effort — partial upload failure does not block report creation.
- Report DB record is created before S3 uploads begin
- Successful uploads: keys collected into `image_s3_keys` array
- Failed uploads: logged with error details; report proceeds with partial or empty `image_s3_keys`
- This matches the existing async pipeline pattern — pipeline handles missing images gracefully

## BR-S3-03: S3 Bucket Access

**Rule**: The S3 images bucket is write-only from the BE perspective at this release.
- `uploadToS3()` uses `PutObjectCommand` with `ContentType` set to the validated MIME type
- No `GetObject` / pre-signed URL generation is required for this release (FR-02 scope = B)
- Bucket name comes from `process.env.S3_IMAGES_BUCKET` — required env var; fail-fast if absent at startup
