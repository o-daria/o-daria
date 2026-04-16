# NFR Requirements — Unit 2: Frontend Authentication

## Security

| ID | Requirement | Implementation Target |
|----|-------------|----------------------|
| SEC-FE-01 | Token never exposed in logs or UI error messages | `googleAuthService.ts`, `AuthProvider.tsx` |
| SEC-FE-02 | `Authorization` header injected via axios defaults (not localStorage read per request) | `AuthProvider.tsx` |
| SEC-FE-03 | `GoogleOAuthProvider` uses `GOOGLE_CLIENT_ID` from build-time env only — never hardcoded | `shell/App.tsx`, `DefinePlugin` in webpack |
| SEC-FE-04 | No sensitive data (token, credential) in React state or component props | `AuthContext.tsx` — context only exposes user, not token |
| SEC-FE-05 | localStorage cleared entirely on logout (no stale token left behind) | `tokenStorage.ts` `clearAll()` |

## Reliability

| ID | Requirement | Implementation Target |
|----|-------------|----------------------|
| REL-FE-01 | Session restore is synchronous on mount — no flash of unauthenticated content | `AuthProvider.tsx` `useEffect` + `isLoading` guard |
| REL-FE-02 | Corrupt/missing localStorage data handled gracefully — falls back to unauthenticated state | `tokenStorage.ts` try/catch |
| REL-FE-03 | 401 auto-logout does not throw; navigation is fire-and-forget | `registerUnauthorizedHandler` in `shell/App.tsx` |

## Compatibility

| ID | Requirement | Implementation Target |
|----|-------------|----------------------|
| COMPAT-FE-01 | `@react-oauth/google` added to `mfe-auth` only (not shell) — shell gets it through `@app/auth` shared singleton | `mfe-auth/package.json` |
| COMPAT-FE-02 | `@app/auth` singleton in Module Federation — no version drift between shell and remotes | All `webpack.config.js` shared config |
| COMPAT-FE-03 | `GOOGLE_CLIENT_ID` available at build time via webpack `DefinePlugin` in both shell and mfe-auth | Both `webpack.config.js` files |

## Maintainability

| ID | Requirement | Implementation Target |
|----|-------------|----------------------|
| MAINT-FE-01 | Deprecated `AuthService` methods have JSDoc `@deprecated` tag with migration note | `AuthService.ts` |
| MAINT-FE-02 | Token key (`app.token`) and user key (`app.user`) defined as constants — not inline strings | `tokenStorage.ts` |

## Tech Stack Decisions

| Package | Version | Rationale |
|---------|---------|-----------|
| `@react-oauth/google` | `^0.12.1` | Official Google Identity Services wrapper for React; minimal bundle; no Firebase |
