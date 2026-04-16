# NFR Design Patterns — Unit 2: Frontend Authentication

## Pattern 1: Build-Time Secret Injection (SEC-FE-03)

`GOOGLE_CLIENT_ID` is injected at webpack build time via `DefinePlugin`:
```js
new DefinePlugin({
  'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID ?? ''),
})
```
This means the client ID is baked into the bundle — never fetched at runtime and never in an `.env` file committed to the repo. The shell and mfe-auth both add this to their respective `DefinePlugin` configs.

## Pattern 2: Axios Header Mutation (SEC-FE-02, BR-FE-AUTH-03)

Token injection uses `apiClient.defaults.headers.common['Authorization']` rather than an interceptor that reads localStorage on every request. This means:
- One write on login/restore, not N reads for N requests
- Removal on logout via `delete apiClient.defaults.headers.common['Authorization']`
- No risk of stale localStorage reads if the header is already set

## Pattern 3: Loading Gate (REL-FE-01)

`AuthProvider` holds `isLoading: true` until the `useEffect` mount check completes:
```
Mount → getUser() + getToken() → setUser()/restore header → setIsLoading(false)
```
`withAuthGuard` (existing) uses `isLoading` to render a loading state instead of redirecting to `/auth/login` — this prevents the flash of unauthenticated content on page reload.

## Pattern 4: Soft Deprecation (MAINT-FE-01)

Old email/password methods are retained but marked:
```typescript
/** @deprecated Use loginWithGoogle() instead. Will be removed in a future release. */
async function login(payload: LoginRequest): Promise<LoginResponse> { ... }
```
This preserves TypeScript compat for any existing imports while signaling intent clearly.

## Pattern 5: Token-Context Separation (SEC-FE-04)

The token is never exposed through `AuthContext`. Context only surfaces:
```typescript
{ user, isAuthenticated, isLoading, loginWithGoogle, logout }
```
The token lives only in `tokenStorage` and `apiClient.defaults`. Components cannot accidentally log or render it.
