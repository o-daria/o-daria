# Business Rules — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## Authentication Rules

### BR-AUTH-01: Session Restoration on Load
- On `AuthProvider` mount, read `localStorage['app.user']`
- If the value exists and is a valid JSON `User` object, restore `AuthState` with `isAuthenticated = true`
- If missing, malformed, or parsing fails, set `isAuthenticated = false` and clear the key
- No network call is made during restoration — the stored profile is trusted until a 401 is received
- **SECURITY note**: Only the non-sensitive user profile (id, email, createdAt) is stored in localStorage. The auth token lives exclusively in the httpOnly cookie managed by the backend. This satisfies SECURITY-12 (no raw tokens in JS-accessible storage).

### BR-AUTH-02: Session Invalidation on 401
- When `apiClient` receives any HTTP 401 response, it MUST:
  1. Remove `localStorage['app.user']`
  2. Call `authService.logout()` to invalidate the server session
  3. Redirect to `/auth/login`
- This rule applies globally, regardless of which module triggered the request

### BR-AUTH-03: Logout Flow
- Logout clears `localStorage['app.user']`
- Logout calls the backend `/auth/logout` endpoint to invalidate the server-side session/cookie
- After logout, the user is redirected to `/auth/login`
- The React auth context is reset to `{ user: null, isAuthenticated: false }`

### BR-AUTH-04: AuthGuard Route Protection
- All routes with `isPublic: false` MUST be wrapped in `AuthGuard`
- `AuthGuard` checks `isAuthenticated` from `AuthContext`
- If `isLoading` is true (initial restore in progress), render a loading spinner — do not redirect yet
- If `isAuthenticated` is false and `isLoading` is false, redirect to `/auth/login`
- After successful login, redirect to `/projects` (fixed — no return URL)

### BR-AUTH-05: Public Route Access When Authenticated
- If an authenticated user navigates to `/auth/login` or `/auth/register`, redirect them to `/projects`
- Prevents logged-in users from seeing auth pages

---

## API Client Rules

### BR-API-01: Typed Error Classification
- All non-2xx responses from the backend MUST be wrapped in an `ApiError` instance
- `ApiError` exposes: `statusCode`, `errorCode` (from response body), `message` (generic, user-safe)
- 401 responses trigger BR-AUTH-02 automatically via the response interceptor
- 5xx responses surface as `ApiError` with `isServerError() === true`; consuming components show generic error UI

### BR-API-02: Auth Token Injection
- Every outbound request from `apiClient` uses `withCredentials: true` to send the httpOnly session cookie automatically
- No Bearer token injection is needed in standard same-origin flows
- For cross-origin calls (if CORS is configured), the cookie is still sent via `withCredentials`

### BR-API-03: Request Timeout
- Default request timeout: 30 seconds
- On timeout, throw `ApiError` with `statusCode: 408` and `errorCode: 'REQUEST_TIMEOUT'`

### BR-API-04: No Secrets in Requests
- `apiClient` MUST NOT log request headers, cookies, or response bodies containing auth data (SECURITY-03)
- Only log: method, URL, status code, and correlation ID

---

## Routing Rules

### BR-ROUTE-01: Default Route
- Navigating to `/` redirects to `/projects`
- If unauthenticated, `AuthGuard` on `/projects` then redirects to `/auth/login`

### BR-ROUTE-02: Unknown Routes
- Any unmatched path renders a 404 Not Found page within the Shell's `GlobalLayout`

### BR-ROUTE-03: MFE Loading Failure
- If a Module Federation remote fails to load (network error, remote not available), `ModuleLoader` renders a fallback error UI with a "Retry" button — the global application does not crash

---

## Navigation Rules

### BR-NAV-01: Sidebar Structure
- Left sidebar contains:
  - App logo / brand mark (top, Chinoiserie motif)
  - Navigation links: **Projects** (`/projects`)
  - User section at the bottom: user email + **Logout** button
- Sidebar supports collapsed (icon-only) and expanded (icon + label) states
- Collapsed/expanded preference persisted in `localStorage['app.sidebarCollapsed']`

### BR-NAV-02: Active Route Highlighting
- The sidebar highlights the active route based on the current URL prefix
- `/projects/*` highlights the Projects nav item

---

## Design System Rules

### BR-DS-01: Tailwind Config Scope
- All design tokens (palette, semantic, component-level) MUST be defined in `@app/ui/tailwind.config.ts`
- MFE modules extend this config via `presets` — they MUST NOT override palette or typography tokens
- Using raw hex colours in component styles is prohibited — only Tailwind token classes

### BR-DS-02: Typography Enforcement
- Display font (Cormorant Garamond or IM Fell English) is applied to all `h1`–`h3` headings and page titles
- Body font (Inter or DM Sans) is applied to all body text, labels, form fields, and buttons
- Fonts loaded via CSS `@font-face` or Google Fonts in the Shell's global CSS

### BR-DS-03: Error Message Display
- User-facing error messages MUST use the `ErrorMessage` component from `@app/ui`
- `ErrorMessage` MUST display only the generic `message` string — never `errorCode`, `statusCode`, or stack traces (SECURITY-09, SECURITY-15)
