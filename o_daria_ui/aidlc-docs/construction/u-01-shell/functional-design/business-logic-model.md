# Business Logic Model — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## 1. Auth State Machine (`@app/auth`)

```
               +------------------+
               |   INITIAL LOAD   |
               | isLoading = true |
               +------------------+
                        |
            Read localStorage['app.user']
                        |
           +------------+------------+
           |                         |
      Valid User found          Not found / invalid
           |                         |
           v                         v
  +------------------+     +-------------------+
  | AUTHENTICATED    |     | UNAUTHENTICATED   |
  | user = User      |     | user = null       |
  | isLoading = false|     | isLoading = false |
  +------------------+     +-------------------+
           |                         |
     API call returns 401      user calls login()
           |                         |
           v                         v
  Clear localStorage       Store user in localStorage
  Call /auth/logout        Set isAuthenticated = true
  Redirect /auth/login     Redirect to /projects
           |
           v
  +-------------------+
  | UNAUTHENTICATED   |
  +-------------------+
```

---

## 2. AuthProvider Bootstrap Logic

```
On mount:
  1. Set isLoading = true
  2. Try: parse localStorage['app.user'] as User
  3a. If valid: set user, isAuthenticated = true
  3b. If invalid/missing: set user = null, isAuthenticated = false, clear key
  4. Set isLoading = false

On AuthService.login() success:
  1. Receive { user } from backend response
  2. Write user to localStorage['app.user']
  3. Update AuthContext: { user, isAuthenticated: true }
  4. Navigate to /projects

On AuthService.logout():
  1. Call POST /auth/logout (invalidates httpOnly cookie server-side)
  2. Remove localStorage['app.user']
  3. Update AuthContext: { user: null, isAuthenticated: false }
  4. Navigate to /auth/login
```

---

## 3. apiClient Interceptor Logic

```
Request interceptor:
  - withCredentials: true (sends httpOnly cookie)
  - Log: method + URL (no headers, no body)

Response interceptor (success):
  - Return response.data

Response interceptor (error):
  - Extract: statusCode, errorCode (from body), message
  - If statusCode === 401:
      → Remove localStorage['app.user']
      → Call authService.logout()
      → Navigate to /auth/login
      → Throw ApiError(401, errorCode, message)
  - Else:
      → Throw ApiError(statusCode, errorCode, message)
```

---

## 4. Route Guard Logic (`AuthGuard`)

```
Render AuthGuard(children):
  1. Read { isAuthenticated, isLoading } from AuthContext
  2. If isLoading: render <Spinner /> (do not redirect)
  3. If !isAuthenticated: <Navigate to="/auth/login" replace />
  4. Else: render children
```

---

## 5. Module Federation Loading Logic (`ModuleLoader`)

```
Render ModuleLoader({ remote, fallback }):
  1. Wrap dynamic import in React.lazy + Suspense
  2. On Suspense: render <Spinner />
  3. On ErrorBoundary catch:
       → Log error (no user-visible details)
       → Render fallback: <ErrorMessage message="Module failed to load" onRetry={reload} />
```

---

## 6. Sidebar State Logic

```
On mount:
  1. Read localStorage['app.sidebarCollapsed'] (boolean)
  2. Default: expanded (false)

On toggle:
  1. Flip collapsed state
  2. Write to localStorage['app.sidebarCollapsed']
  3. Re-render sidebar width (collapsed = icon only, expanded = icon + label)
```

---

## 7. Design Token Composition (`@app/ui`)

```
tailwind.config.ts
  └── theme.extend.colors
        ├── jade.DEFAULT, jade.light, jade.dark
        ├── porcelain.DEFAULT, porcelain.light, porcelain.dark
        ├── gold.DEFAULT, gold.light, gold.dark
        ├── ivory.DEFAULT, ivory.dark
        ├── ink.DEFAULT, ink.light
        ├── success, warning, error, info, disabled
        ├── surface, surface-elevated, surface-dark
        └── [component tokens: button-primary-bg, card-border, etc.]
  └── theme.extend.fontFamily
        ├── display: [Cormorant Garamond, IM Fell English, serif]
        └── body:    [Inter, DM Sans, sans-serif]

MFE tailwind.config.ts:
  presets: [require('@app/ui/tailwind.config')]  // inherit all tokens
  // NO overrides to palette or font families
```
