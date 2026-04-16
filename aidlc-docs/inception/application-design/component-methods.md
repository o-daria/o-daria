# Component Methods

Note: Detailed business rules and validation logic are defined in Functional Design (per-unit, CONSTRUCTION phase). This document covers method signatures, purpose, and input/output contracts.

---

## BE — `GoogleAuthService` (`src/services/googleAuthService.js`)

### `verifyGoogleToken(credential: string): Promise<GoogleTokenPayload>`
- **Purpose**: Validate a Google ID token and extract the verified payload
- **Input**: `credential` — raw Google ID token string from `@react-oauth/google`
- **Output**: `{ sub, email, name, email_verified }` from Google's verified payload
- **Throws**: Error if credential is empty, malformed, or fails Google verification
- **Note**: Uses `OAuth2Client` from `google-auth-library`; client ID from `process.env.GOOGLE_CLIENT_ID`

### `upsertTenant(email: string, client: PoolClient): Promise<{ id: string }>`
- **Purpose**: Find or create a tenant for a Google user on first login
- **Input**: `email` — verified Google email; `client` — DB transaction client
- **Output**: `{ id }` — tenant UUID
- **Note**: Tenant name derived from email (e.g., `user@example.com` → `"example.com"`); uses `ON CONFLICT DO NOTHING` + select

### `upsertUser(payload: GoogleTokenPayload, tenantId: string, client: PoolClient): Promise<{ id: string, email: string, name: string }>`
- **Purpose**: Find or create a user record linked to `google_sub`; update `last_login_at`
- **Input**: `payload` — verified Google token payload; `tenantId` — resolved tenant UUID; `client` — DB transaction client
- **Output**: `{ id, email, name }` — user record
- **Note**: Uses `INSERT ... ON CONFLICT (google_sub) DO UPDATE SET last_login_at = NOW()`

### `createSession(userId: string, tenantId: string, client: PoolClient): Promise<{ token: string }>`
- **Purpose**: Generate a secure session token and persist it in the `sessions` table
- **Input**: `userId`, `tenantId`, `client` — DB transaction client
- **Output**: `{ token }` — 64-char hex session token (32 bytes)
- **Note**: `token = crypto.randomBytes(32).toString('hex')`; `expires_at = NOW() + INTERVAL '30 days'`

---

## BE — `AuthMiddleware` (`src/middleware/auth.middleware.js`)

### `authenticate(req, res, next): Promise<void>`
- **Purpose**: Express middleware — validates session token and attaches `tenantId` to request
- **Input**: Express `req` with `Authorization: Bearer <token>` header
- **Output**: Calls `next()` on success; returns `401` JSON on failure
- **Logic paths**:
  1. Missing header → 401
  2. Token matches `process.env.API_KEY` → attach dev `TENANT_ID`, call `next()` (dev shortcut)
  3. DB lookup: `SELECT tenant_id FROM sessions WHERE token = $1 AND expires_at > NOW()` → attach `req.tenantId`, call `next()`
  4. No session found → 401
- **Note**: Never logs token value; `tenantId` attached as `.toString()` for TEXT column compat

---

## BE — `AuthRouter` (`src/routes/auth.routes.js`)

### `POST /auth/google` handler
- **Purpose**: Validate Google credential, upsert user, return session token
- **Input body**: `{ credential: string }` — non-empty Google ID token
- **Output**: `200 { token: string, user: { id, email, name, createdAt } }` on success
- **Output errors**: `400` if `credential` missing/empty; `500` on DB/Google API failure
- **Note**: Entire upsert runs in a DB transaction; no token/PII logged

---

## BE — `S3Service` (`src/services/s3Service.js`)

### `getS3Key(reportId: string, originalFilename: string): string`
- **Purpose**: Derive a deterministic, sanitized S3 object key
- **Input**: `reportId` — UUID; `originalFilename` — original upload filename
- **Output**: `profiles/<reportId>/<sanitized-filename>` — no raw user-controlled strings in key
- **Note**: Sanitize by extracting extension only (`path.extname`) + UUID-based name for the file portion

### `uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<string>`
- **Purpose**: Upload image buffer to the images S3 bucket
- **Input**: `buffer` — image bytes; `key` — from `getS3Key()`; `mimeType` — validated MIME type
- **Output**: S3 key (same as input `key`) — stored in DB for later retrieval
- **Note**: Bucket name from `process.env.S3_IMAGES_BUCKET`; `ACL` not set (bucket is private)

---

## FE — `googleAuthService.ts` (`packages/@app/auth/src/googleAuthService.ts`)

### `loginWithGoogleCredential(credential: string): Promise<GoogleAuthResponse>`
- **Purpose**: POST Google credential to BE and return session token + user
- **Input**: `credential` — Google ID token from `@react-oauth/google` `onSuccess` callback
- **Output**: `{ token: string, user: User }` — `GoogleAuthResponse`
- **Note**: Uses `authHttp` axios instance (same base URL pattern as existing `AuthService`)

---

## FE — `tokenStorage` (`packages/@app/auth/src/tokenStorage.ts`)

### `getToken(): string | null`
- **Purpose**: Retrieve session token from localStorage
- **Output**: Token string or `null` if absent/malformed

### `setToken(token: string): void`
- **Purpose**: Persist session token to localStorage
- **Input**: `token` — session token string

### `clearAll(): void`
- **Purpose**: Remove both token (`app.token`) and user (`app.user`) from localStorage
- **Note**: Replaces old `clearUser()` — called on logout and 401 handler

---

## FE — `AuthService` (`packages/@app/auth/src/AuthService.ts`)

### `loginWithGoogle(credential: string): Promise<GoogleAuthResponse>` *(new)*
- **Purpose**: Delegate to `googleAuthService.loginWithGoogleCredential()`
- **Input**: `credential` — Google ID token
- **Output**: `GoogleAuthResponse`

### `logout(): Promise<void>` *(unchanged)*
- **Purpose**: Client-side only — no server call; `AuthProvider` clears local state
- **Note**: Kept as no-op async for interface consistency

### `login(payload: LoginRequest): Promise<LoginResponse>` *(@deprecated)*
### `register(payload: RegisterRequest): Promise<RegisterResponse>` *(@deprecated)*
### `requestPasswordReset(email: string): Promise<void>` *(@deprecated)*
### `resetPassword(payload: ResetPasswordRequest): Promise<void>` *(@deprecated)*
### `validateToken(): Promise<User>` *(@deprecated)*
- **Note**: Soft-removed (Q5=B) — stubs with `@deprecated` JSDoc; throw `Error('Removed: use loginWithGoogle')` if called

---

## FE — `AuthProvider` (`packages/@app/auth/src/AuthProvider.tsx`)

### `loginWithGoogle(credential: string): Promise<void>`
- **Purpose**: Orchestrate Google login flow — call service, persist, inject header, navigate
- **Input**: `credential` — Google ID token
- **Steps**: `AuthService.loginWithGoogle(credential)` → `tokenStorage.setToken(token)` → `tokenStorage.setUser(user)` → `apiClient.defaults.headers.common['Authorization'] = \`Bearer \${token}\`` → `navigate('/projects')`

### `logout(): Promise<void>`
- **Purpose**: Clear all auth state and redirect
- **Steps**: `tokenStorage.clearAll()` → `delete apiClient.defaults.headers.common['Authorization']` → `navigate('/auth/login')`

### Mount effect (anonymous)
- **Purpose**: Restore auth session on app load
- **Steps**: `tokenStorage.getToken()` + `tokenStorage.getUser()` → if both present: re-attach header to `apiClient`, set user state
- **Note**: Also calls `registerUnauthorizedHandler(() => logout())` from `@app/api-client`
