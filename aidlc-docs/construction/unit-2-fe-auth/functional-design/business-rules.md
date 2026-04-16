# Business Rules — Unit 2: Frontend Authentication

## BR-FE-AUTH-01: Google Credential Forwarding
**Rule**: The `credential` string from `@react-oauth/google` `onSuccess` callback MUST be forwarded to `POST /auth/google` without modification. No FE-side validation of the token — validation is BE responsibility.

## BR-FE-AUTH-02: Token + User Persistence
**Rule**: On successful login, BOTH `token` AND `user` must be persisted to localStorage before navigating to `/projects`. Partial state (user without token or token without user) must never be written.

## BR-FE-AUTH-03: Authorization Header Injection
**Rule**: After login (and after session restore), `apiClient.defaults.headers.common['Authorization']` MUST be set to `Bearer <token>`. All subsequent API requests carry this header automatically via axios defaults.

## BR-FE-AUTH-04: Session Restore on Mount
**Rule**: On `AuthProvider` mount, if both `tokenStorage.getToken()` and `tokenStorage.getUser()` return non-null values, the session MUST be restored (user set in state, Authorization header injected) without any network call.

## BR-FE-AUTH-05: Full Clear on Logout
**Rule**: Logout MUST clear both `app.token` and `app.user` from localStorage, remove the `Authorization` header from `apiClient.defaults`, and navigate to `/auth/login`. This applies to both explicit logout and automatic 401 logout.

## BR-FE-AUTH-06: 401 Auto-Logout
**Rule**: The `registerUnauthorizedHandler` callback registered in `shell/App.tsx` MUST trigger navigation to `/auth/login`. The 401 interceptor in `apiClient` calls this automatically on any 401 response.

## BR-FE-AUTH-07: No Token Logging
**Rule**: The session token and Google credential MUST NOT appear in any console.log, logger call, or error message. Allowed: userId, email (display only). Forbidden: token values, credential strings.

## BR-FE-AUTH-08: GoogleOAuthProvider Location
**Rule**: `GoogleOAuthProvider` from `@react-oauth/google` MUST be placed in the shell `App.tsx` (the Module Federation host), not in `mfe-auth`. This ensures the Google OAuth context is available to all MFEs through the singleton `@app/auth` package.

## BR-FE-AUTH-09: Authenticated Redirect
**Rule**: If `isAuthenticated` is true when `LoginPage` renders, redirect to `/projects` immediately (using `<Navigate to="/projects" replace />`).

## BR-FE-AUTH-10: Deprecated Methods Preserved
**Rule**: Existing email/password methods in `AuthService.ts` (`login`, `register`, `requestPasswordReset`, `resetPassword`, `validateToken`, `logout`) MUST be soft-deprecated (JSDoc `@deprecated`) but NOT removed. This preserves compile-time compat if any other package still imports them.
