# Code Summary — Unit 2: Frontend Authentication

## Unit Context

- **Unit**: Unit 2 — Frontend Authentication (`ui`)
- **Requirements covered**: FR-01, NFR-01, NFR-05, NFR-07, NFR-09
- **All 15 steps executed successfully**

---

## Created Files

| File                                             | Description                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `ui/packages/@app/auth/src/googleAuthService.ts` | `loginWithGoogleCredential(credential)` — POSTs to `POST /auth/google`, returns `GoogleAuthResponse` |

---

## Modified Files

| File                                         | Change Summary                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/packages/@app/auth/src/types.ts`         | Added `name?: string` to `User`; added `GoogleAuthResponse` interface; soft-deprecated `LoginRequest`, `LoginResponse`, `RegisterRequest`, `RegisterResponse`, `ResetPasswordRequest`                                                                                                                       |
| `ui/packages/@app/auth/src/tokenStorage.ts`  | Added `TOKEN_KEY = 'app.token'`, `getToken()`, `setToken()`, `clearAll()` (removes both USER_KEY and TOKEN_KEY); exported all from `tokenStorage` object                                                                                                                                                    |
| `ui/packages/@app/auth/src/AuthService.ts`   | Added `loginWithGoogle(credential)` delegating to `googleAuthService`; soft-deprecated all email/password methods (`login`, `register`, `logout`, `requestPasswordReset`, `resetPassword`, `validateToken`)                                                                                                 |
| `ui/packages/@app/auth/src/AuthContext.tsx`  | Replaced `login: (payload: LoginRequest) => Promise<void>` with `loginWithGoogle: (credential: string) => Promise<void>`; removed `LoginRequest` import                                                                                                                                                     |
| `ui/packages/@app/auth/src/AuthProvider.tsx` | Imported `apiClient` from `@app/api-client`; replaced `login` useCallback with `loginWithGoogle` (stores token + user, injects `Authorization` header); updated `logout` to call `tokenStorage.clearAll()` + delete Authorization header; updated mount `useEffect` to restore token + user + inject header |
| `ui/packages/@app/auth/src/index.ts`         | Added `GoogleAuthResponse` export; kept all existing exports with `@deprecated` JSDoc on old email/password types                                                                                                                                                                                           |
| `ui/packages/@app/auth/package.json`         | Added `@app/api-client: *` as dependency (required by `AuthProvider.tsx`)                                                                                                                                                                                                                                   |
| `ui/apps/mfe-auth/package.json`              | Added `@react-oauth/google: ^0.12.1` to dependencies                                                                                                                                                                                                                                                        |
| `ui/apps/mfe-auth/webpack.config.js`         | Added `@app/api-client` alias; added `process.env.GOOGLE_CLIENT_ID` to `DefinePlugin`                                                                                                                                                                                                                       |
| `ui/apps/shell/webpack.config.js`            | Added `process.env.GOOGLE_CLIENT_ID` to `DefinePlugin`                                                                                                                                                                                                                                                      |
| `ui/apps/shell/package.json`                 | Added `@react-oauth/google: ^0.12.1` to dependencies                                                                                                                                                                                                                                                        |
| `ui/apps/mfe-auth/src/pages/LoginPage.tsx`   | Removed Formik email/password form; replaced with `<GoogleLogin>` from `@react-oauth/google`; retained brand mark + `Card` + `DecorativeDivider`; calls `loginWithGoogle(credentialResponse.credential)` on success; shows error message on failure                                                         |
| `ui/apps/mfe-auth/src/Module.tsx`            | Removed `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage` routes and imports; kept only `login` route + `*` fallback to `<LoginPage />`                                                                                                                                                             |
| `ui/apps/shell/src/App.tsx`                  | Imported `GoogleOAuthProvider`; wrapped `QueryClientProvider` + `BrowserRouter` + `InnerApp` in `<GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID ?? ""}>`                                                                                                                                       |
| `ui/.env.example`                            | Added `GOOGLE_CLIENT_ID=` with comment pointing to Google Cloud Console                                                                                                                                                                                                                                     |

---

## NFR Compliance

| Pattern                     | Rule        | Status                                                                                     |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Build-time secret injection | SEC-FE-03   | Compliant — `DefinePlugin` in both shell + mfe-auth                                        |
| Axios header mutation       | SEC-FE-02   | Compliant — `apiClient.defaults.headers.common['Authorization']` set once on login/restore |
| Loading gate                | REL-FE-01   | Compliant — `isLoading: true` until mount effect completes                                 |
| Soft deprecation            | MAINT-FE-01 | Compliant — all old methods retained with `@deprecated` JSDoc                              |
| Token-context separation    | SEC-FE-04   | Compliant — token not exposed in `AuthContext`                                             |

---

## Acceptance Criteria Status

- [x] Google Sign-In button renders on `/auth/login` (no email/password form)
- [x] Successful Google login → `app.token` + `app.user` in localStorage → navigate to `/projects`
- [x] Page reload → session restored → stays on `/projects` (mount useEffect restores both token + user)
- [x] Logout → localStorage cleared → `Authorization` header removed → `/auth/login`
- [x] `GOOGLE_CLIENT_ID` baked in at build time via `DefinePlugin` in both shell + mfe-auth webpack configs
- [x] `GoogleOAuthProvider` wraps entire app in shell (host) — available to all MFEs via singleton `@app/auth`
