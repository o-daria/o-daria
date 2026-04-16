# Domain Entities — Unit 1: Backend Authentication

## Entity: Tenant

**Purpose**: Represents an isolated organizational unit. Every user belongs to exactly one tenant. All data (reports, projects) is scoped to a tenant.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, auto-generated | `uuid_generate_v4()` |
| `name` | TEXT | NOT NULL | Derived from Google email domain on auto-create (e.g. `"example.com"`) |
| `plan` | TEXT | NOT NULL | Default `'starter'` for auto-created tenants |

**Existing table** — no schema change. Auto-create on first Google login inserts via `ON CONFLICT (id) DO NOTHING`.

---

## Entity: User

**Purpose**: Represents an authenticated person linked to a Google account and a tenant.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, auto-generated | `uuid_generate_v4()` |
| `google_sub` | TEXT | NOT NULL, UNIQUE | Google's opaque user identifier (`sub` claim in ID token) |
| `email` | TEXT | NOT NULL | Verified Google email — stored but never logged |
| `name` | TEXT | nullable | Google display name (may be absent for some accounts) |
| `tenant_id` | UUID | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `last_login_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Updated on every login |

**Index**: `users_google_sub_idx ON users (google_sub)` — fast lookup by Google UID.

---

## Entity: Session

**Purpose**: Server-side session record linking a token to a user and tenant with an expiry.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `token` | TEXT | PK | 64-char hex string — `crypto.randomBytes(32).toString('hex')` |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| `tenant_id` | UUID | NOT NULL | Denormalized for fast middleware lookup (avoids JOIN) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `expires_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() + INTERVAL '30 days' | |

**Index**: `sessions_expires_idx ON sessions (expires_at)` — supports future cleanup of expired sessions.

---

## Entity: GoogleTokenPayload (Value Object — not persisted)

**Purpose**: The verified claims extracted from a Google ID token after `verifyIdToken()`.

| Field | Type | Source |
|-------|------|--------|
| `sub` | string | Google UID — maps to `users.google_sub` |
| `email` | string | Verified Google email |
| `name` | string \| undefined | Google display name |
| `email_verified` | boolean | Must be `true` — rejected otherwise |

---

## Entity: S3UploadResult (Value Object — not persisted)

**Purpose**: Represents the outcome of a single S3 image upload.

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | S3 object key — `profiles/<reportId>/<uuid>.<ext>` |
| `bucket` | string | From `process.env.S3_IMAGES_BUCKET` |

---

## Entity Relationships

```
tenants (existing)
    |
    | 1:N
    v
users (new)
    |
    | 1:N
    v
sessions (new)

reports (existing)
    |  tenant_id TEXT (existing — no change)
    |  image_s3_keys JSONB[] (new field — array of S3 keys)
```

**Type bridge**: `sessions.tenant_id` is UUID. `reports.tenant_id` and `projects.tenant_id` are TEXT. The `authenticate()` middleware bridges via `.toString()` — no schema migration on existing tables needed.
