# Code Generation Plan — Unit 2: Frontend Authentication

## Unit Context

- **Unit**: Unit 2 — Frontend Authentication (`ui`)
- **Workspace root**: `/Users/vi-kaivladyslav_fanh/Documents/o_daria`
- **Application code location**: `ui/` (NEVER aidlc-docs/)
- **Project type**: Brownfield — modify existing files in-place; create new files where listed
- **Requirements covered**: FR-01, NFR-01, NFR-05, NFR-07, NFR-09
- **Blocks**: Unit 3 (local stack needs working FE build)

## Dependencies

- Requires: Unit 1 (stable `POST /auth/google` contract — locked)
- Shared contract consumed: `POST /auth/google` → `{ token, user: { id, email, name, createdAt } }`

---

## Steps

### Step 1: `types.ts` — add `name` + `GoogleAuthResponse` [x]

**Action**: MODIFY `ui/packages/@app/auth/src/types.ts`
**Changes**:

- Add `name?: string` to `User` interface
- Add `GoogleAuthResponse` interface: `{ token: string; user: User }`
- Soft-deprecate `LoginRequest`, `LoginResponse`, `RegisterRequest`, `RegisterResponse`, `ResetPasswordRequest` (JSDoc `@deprecated`)
  **Traceability**: BR-FE-AUTH-10

### Step 2: `tokenStorage.ts` — add token methods [x]

**Action**: MODIFY `ui/packages/@app/auth/src/tokenStorage.ts`
**Changes**:

- Add `TOKEN_KEY = 'app.token'` constant
- Add `getToken(): string | null`
- Add `setToken(token: string): void`
- Rename `clearUser()` → keep `clearUser()`, add `clearAll()` that removes both keys
- Export updated `tokenStorage` object: `{ getUser, setUser, clearUser, getToken, setToken, clearAll }`
  **Traceability**: BR-FE-AUTH-02, BR-FE-AUTH-05, MAINT-FE-02

### Step 3: `googleAuthService.ts` — new file [x]

**Action**: CREATE `ui/packages/@app/auth/src/googleAuthService.ts`
**Content**: Single function `loginWithGoogleCredential(credential: string): Promise<GoogleAuthResponse>` that POSTs to `/auth/google`
**Traceability**: BR-FE-AUTH-01, SEC-FE-01

### Step 4: `AuthService.ts` — add `loginWithGoogle`, soft-deprecate old methods [x]

**Action**: MODIFY `ui/packages/@app/auth/src/AuthService.ts`
**Changes**:

- Add `loginWithGoogle(credential: string): Promise<GoogleAuthResponse>` — delegates to `googleAuthService.ts`
- Mark `login`, `register`, `logout`, `requestPasswordReset`, `resetPassword`, `validateToken` as `@deprecated`
  **Traceability**: BR-FE-AUTH-10, MAINT-FE-01

### Step 5: `AuthContext.tsx` — replace `login` with `loginWithGoogle` [x]

**Action**: MODIFY `ui/packages/@app/auth/src/AuthContext.tsx`
**Changes**:

- Replace `login: (payload: LoginRequest) => Promise<void>` with `loginWithGoogle: (credential: string) => Promise<void>`
- Remove `LoginRequest` import
  **Traceability**: BR-FE-AUTH-01

### Step 6: `AuthProvider.tsx` — wire `loginWithGoogle`, token inject, session restore [x]

**Action**: MODIFY `ui/packages/@app/auth/src/AuthProvider.tsx`
**Changes**:

- Import `apiClient` from `@app/api-client`
- Import `tokenStorage.getToken`, `setToken`, `clearAll`
- Import `AuthService.loginWithGoogle`
- Replace `login` useCallback with `loginWithGoogle(credential)`:
  - Calls `AuthService.loginWithGoogle(credential)` → `{ token, user }`
  - `tokenStorage.setToken(token)` + `tokenStorage.setUser(user)`
  - `apiClient.defaults.headers.common['Authorization'] = \`Bearer \${token}\``
  - `setUser(user)` → `navigate('/projects')`
- Update `logout` useCallback:
  - `tokenStorage.clearAll()`
  - `delete apiClient.defaults.headers.common['Authorization']`
  - `setUser(null)` → `navigate('/auth/login')`
- Update mount `useEffect` to restore token + user + inject header if both exist
- Remove `LoginRequest` import; update context value to use `loginWithGoogle`
  **Traceability**: BR-FE-AUTH-02..06, SEC-FE-02, REL-FE-01

### Step 7: `index.ts` — update exports [x]

**Action**: MODIFY `ui/packages/@app/auth/src/index.ts`
**Changes**:

- Add export for `GoogleAuthResponse` from `./types`
- Keep all existing exports (backward compat)
- Soft-deprecate `LoginRequest`, `LoginResponse`, etc. exports via re-export with `@deprecated` comments
  **Traceability**: MAINT-FE-01

### Step 8: `mfe-auth/package.json` — add `@react-oauth/google` [x]

**Action**: MODIFY `ui/apps/mfe-auth/package.json`
**Change**: Add `"@react-oauth/google": "^0.12.1"` to `dependencies`
**Traceability**: COMPAT-FE-01

### Step 9: `mfe-auth/webpack.config.js` — add `GOOGLE_CLIENT_ID` to DefinePlugin [x]

**Action**: MODIFY `ui/apps/mfe-auth/webpack.config.js`
**Change**: Add `'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID ?? '')` to `DefinePlugin`
**Traceability**: SEC-FE-03, COMPAT-FE-03

### Step 10: `shell/webpack.config.js` — add `GOOGLE_CLIENT_ID` to DefinePlugin [x]

**Action**: MODIFY `ui/apps/shell/webpack.config.js`
**Change**: Add `'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID ?? '')` to `DefinePlugin`
**Traceability**: SEC-FE-03, COMPAT-FE-03

### Step 11: `LoginPage.tsx` — replace Formik form with `<GoogleLogin>` [x]

**Action**: MODIFY `ui/apps/mfe-auth/src/pages/LoginPage.tsx`
**Changes**:

- Remove: `useFormik`, `loginSchema`, `Input`, `Button`, `ErrorMessage`, `Link` (to register/forgot-password)
- Keep: brand mark, `Card`, `DecorativeDivider`, `isAuthenticated` redirect
- Add: `import { GoogleLogin } from '@react-oauth/google'`
- Replace form with `<GoogleLogin onSuccess={...} onError={...} />`
  - `onSuccess`: calls `loginWithGoogle(credentialResponse.credential)` from `useAuth()`
  - `onError`: sets a local error state → displays simple error message below the button
    **Traceability**: BR-FE-AUTH-01, BR-FE-AUTH-09

### Step 12: `Module.tsx` — remove Register/ForgotPassword/ResetPassword routes [x]

**Action**: MODIFY `ui/apps/mfe-auth/src/Module.tsx`
**Changes**:

- Remove `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage` route entries
- Remove their imports
- Keep only `login` route + `*` fallback → `<LoginPage />`
  **Traceability**: Unit 2 scope (Q7=B — routes removed, files kept)

### Step 13: `shell/App.tsx` — add `GoogleOAuthProvider` wrapper [x]

**Action**: MODIFY `ui/apps/shell/src/App.tsx`
**Changes**:

- Import `{ GoogleOAuthProvider }` from `@react-oauth/google`
- Wrap `InnerApp` in `<GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID ?? ''}>`
  **Traceability**: BR-FE-AUTH-08, SEC-FE-03

### Step 14: `ui/.env.example` — add `GOOGLE_CLIENT_ID` [x]

**Action**: MODIFY `ui/.env.example`
**Change**: Add `GOOGLE_CLIENT_ID=` with comment
**Traceability**: SEC-FE-03

### Step 15: Code summary doc [x]

**Action**: CREATE `aidlc-docs/construction/unit-2-fe-auth/code/summary.md`
**Content**: List of created/modified files with brief description

---

## Acceptance Verification (after generation)

- [ ] Google Sign-In button renders on `/auth/login` (no email/password form)
- [ ] Successful Google login → `app.token` + `app.user` in localStorage → navigate to `/projects`
- [ ] Page reload → session restored → stays on `/projects`
- [ ] Logout → localStorage cleared → `Authorization` header removed → `/auth/login`
- [ ] `pnpm build` succeeds across all apps with `GOOGLE_CLIENT_ID` set
- [ ] No TypeScript errors: `pnpm type-check`
