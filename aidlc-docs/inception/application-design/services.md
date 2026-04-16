# Services

## Service Definitions and Orchestration Patterns

---

## BE Services

### `GoogleAuthService` — Authentication Orchestration

**Type**: Stateless service module (ESM, no class instantiation)
**File**: `src/services/googleAuthService.js`
**Dependencies**: `google-auth-library`, `crypto`, `src/db/client.js`

**Orchestration pattern** for `POST /auth/google`:

```
AuthRouter
  └── validates input (credential non-empty string)
  └── GoogleAuthService.verifyGoogleToken(credential)
      └── OAuth2Client.verifyIdToken()  ← external: Google API
  └── BEGIN TRANSACTION
      └── GoogleAuthService.upsertTenant(email, client)
      └── GoogleAuthService.upsertUser(payload, tenantId, client)
      └── GoogleAuthService.createSession(userId, tenantId, client)
  └── COMMIT
  └── return { token, user }
```

**Error handling**: Any failure in the transaction rolls back atomically. Google API failures propagate as 500 (not 401 — avoids leaking whether the credential was valid or the DB failed).

**Isolation**: Each exported function takes a DB client parameter for transaction support. `verifyGoogleToken` is pure (no DB) and independently testable.

---

### `S3Service` — Image Storage

**Type**: Stateless service module (ESM, no class instantiation)
**File**: `src/services/s3Service.js`
**Dependencies**: `@aws-sdk/client-s3`, `path`, `crypto`

**Orchestration pattern** for image upload in `POST /reports`:

```
app.js POST /reports handler
  └── multer processes upload (memory storage — unchanged)
  └── for each file in req.files:
      └── S3Service.getS3Key(reportId, file.originalname)
      └── S3Service.uploadToS3(file.buffer, key, file.mimetype)
      └── collect returned keys
  └── INSERT into reports with s3_image_keys JSONB array
  └── pass s3_image_keys to pipeline params
```

**Key isolation principle**: S3 keys are derived from `reportId` (server-generated UUID) + sanitized extension only — never from raw user-supplied filenames. This prevents path traversal and key injection.

---

### `AuthMiddleware` — Request Authentication

**Type**: Express middleware function
**File**: `src/middleware/auth.middleware.js`
**Dependencies**: `src/db/client.js`

**Orchestration pattern** for every protected request:

```
Incoming request
  └── AuthMiddleware.authenticate()
      ├── [missing header]  → 401
      ├── [token == API_KEY] → req.tenantId = TENANT_ID (dev path)
      └── [DB lookup]
          └── SELECT tenant_id FROM sessions WHERE token=$1 AND expires_at>NOW()
              ├── [found]   → req.tenantId = row.tenant_id.toString()
              └── [not found] → 401
  └── next() → route handler
```

**API_KEY dev path**: Retained for local `curl` testing and CI scripts. Never used in production (no `API_KEY` env var set in production deployment).

---

## FE Services

### `AuthService` — Auth Operations Facade

**Type**: Exported object (module pattern, no class)
**File**: `packages/@app/auth/src/AuthService.ts`
**Dependencies**: `./googleAuthService`, `axios`

**Role**: Single import point for auth operations consumed by `AuthProvider`. Does not own state or side effects — pure HTTP + delegation.

**Interaction**:
```
AuthProvider
  └── AuthService.loginWithGoogle(credential)
      └── googleAuthService.loginWithGoogleCredential(credential)
          └── POST /auth/google  ← BE AuthRouter
```

---

### `AuthProvider` — Auth State Orchestrator

**Type**: React context provider component
**File**: `packages/@app/auth/src/AuthProvider.tsx`
**Dependencies**: `AuthService`, `tokenStorage`, `apiClient` (from `@app/api-client`), `registerUnauthorizedHandler`

**Role**: Single source of truth for auth state. Owns the full auth lifecycle:

| Event | Orchestration |
|-------|--------------|
| App mount | Restore token+user from localStorage → inject `Authorization` header → set user state |
| `loginWithGoogle` | Call service → persist token+user → inject header → navigate |
| `logout` | Clear storage → remove header → navigate |
| 401 from any API call | `registerUnauthorizedHandler` triggers `logout()` automatically |

**Module Federation note**: `AuthProvider` is part of the `@app/auth` singleton shared module. `GoogleOAuthProvider` (from `@react-oauth/google`) wraps it in the **shell** (`App.tsx`) — not inside `AuthProvider` itself — to avoid the provider being instantiated per-remote.

---

## Service Interaction Summary

```
[User clicks Google Sign-In button]
        |
        v
LoginPage (mfe-auth)
  GoogleLogin.onSuccess(credentialResponse)
        |
        v
AuthProvider.loginWithGoogle(credential)
        |
        v
AuthService.loginWithGoogle(credential)
        |
        v
googleAuthService.loginWithGoogleCredential(credential)
        |
  POST /auth/google
        |
        v
BE: AuthRouter
        |
        v
GoogleAuthService
  verifyGoogleToken → Google API
  upsertTenant → DB
  upsertUser   → DB
  createSession → DB
        |
  { token, user }
        |
        v
AuthProvider (receives response)
  tokenStorage.setToken(token)
  tokenStorage.setUser(user)
  apiClient headers['Authorization'] = `Bearer ${token}`
  navigate('/projects')
        |
        v
[All subsequent API calls include Authorization: Bearer <token>]
        |
        v
AuthMiddleware (every protected BE route)
  DB lookup: sessions WHERE token=$1 AND expires_at > NOW()
  req.tenantId = row.tenant_id.toString()
```
