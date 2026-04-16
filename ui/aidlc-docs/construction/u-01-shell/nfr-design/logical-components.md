# Logical Components — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## Component Map

```
@app/auth
  ├── AuthProvider          ← React context provider (auth state)
  ├── tokenStorage          ← localStorage abstraction (user profile only)
  ├── AuthService           ← API calls for auth flows
  └── withAuthGuard         ← HOC / route guard

@app/api-client
  ├── apiClient             ← Axios instance (interceptors, withCredentials)
  ├── logger                ← Pluggable logger singleton
  ├── ProjectsApiService    ← Project CRUD endpoints
  ├── ReportsApiService     ← Report fetch endpoints
  ├── CanvaApiService       ← Canva 2-step endpoints
  └── sseClient             ← SSE factory (EventSource wrapper)

@app/ui
  ├── tailwind.config.ts    ← Chinoiserie design token registry
  ├── Button                ← Chinoiserie-styled action button
  ├── Input                 ← Form input with error state
  ├── Card                  ← Decorated container (gold border option)
  ├── Badge                 ← Project status indicator
  ├── Dialog                ← Focus-trapped modal
  ├── Spinner               ← Jade/gold animated loader
  ├── ErrorMessage          ← Safe generic error display
  ├── EmptyState            ← Guided empty list state
  └── DecorativeDivider     ← Chinoiserie ornamental rule

apps/shell
  ├── App                   ← Root: AuthProvider + BrowserRouter
  ├── AppRouter             ← Route definitions, lazy MFE imports
  ├── AuthGuard             ← Route-level auth enforcement
  ├── GlobalLayout          ← Shell chrome: sidebar + page outlet
  ├── Sidebar               ← Collapsible left nav (Chinoiserie dark theme)
  ├── GlobalErrorBoundary   ← Top-level catch-all error boundary
  └── ModuleLoader          ← MFE remote wrapper with Suspense + ErrorBoundary
```

---

## Logical Component Details

### Logger (in `@app/api-client`)

**Type**: Singleton service, Strategy pattern  
**Responsibility**: Structured JSON logging with pluggable transport

```
Logger
  ├── transport: LogTransport (injected)
  ├── correlationId: string   (set once on module init via crypto.randomUUID())
  ├── info(msg, ctx?)
  ├── warn(msg, ctx?)
  └── error(msg, ctx?)

ConsoleTransport implements LogTransport
  └── log(entry): JSON.stringify(entry) → console[level]

CloudWatchTransport implements LogTransport   [Phase 2]
  └── log(entry): POST to log forwarding endpoint
```

---

### apiClient (in `@app/api-client`)

**Type**: Configured Axios singleton  
**Responsibility**: All outbound HTTP — auth injection, error normalization, 401 handling

```
apiClient (axios instance)
  ├── baseURL: VITE_API_BASE_URL (env var)
  ├── withCredentials: true
  ├── timeout: 30_000ms
  ├── Request interceptor:
  │     └── Attach X-Correlation-ID header from logger.correlationId
  └── Response interceptor:
        ├── Success: return response.data
        └── Error:
              ├── Extract statusCode, errorCode, message from response
              ├── If 401: clear localStorage + logout() + navigate('/auth/login')
              └── Throw ApiError(statusCode, errorCode, message)
```

---

### tokenStorage (in `@app/auth`)

**Type**: Module-level abstraction (not a class — plain functions)  
**Responsibility**: Read/write user profile to localStorage; validate shape on read

```
tokenStorage
  ├── getUser(): User | null
  │     └── parse localStorage['app.user']; return null on any failure
  ├── setUser(user: User): void
  │     └── JSON.stringify → localStorage['app.user']
  └── clearUser(): void
        └── localStorage.removeItem('app.user')
```

---

### AuthProvider (in `@app/auth`)

**Type**: React context provider  
**Responsibility**: Single source of truth for auth state; exposes `useAuth()` hook

```
AuthProvider
  ├── State: { user, isAuthenticated, isLoading }
  ├── On mount:
  │     ├── isLoading = true
  │     ├── user = tokenStorage.getUser()
  │     ├── isAuthenticated = user !== null
  │     └── isLoading = false
  ├── login(payload):
  │     ├── AuthService.login(payload) → { user }
  │     ├── tokenStorage.setUser(user)
  │     ├── setState({ user, isAuthenticated: true })
  │     └── navigate('/projects')
  └── logout():
        ├── AuthService.logout()        (POST /auth/logout)
        ├── tokenStorage.clearUser()
        ├── setState({ user: null, isAuthenticated: false })
        └── navigate('/auth/login')
```

---

### AuthGuard (in `apps/shell`)

**Type**: React component (route wrapper)  
**Responsibility**: Deny-by-default route protection

```
AuthGuard({ children, redirectTo = '/auth/login' })
  ├── reads: { isAuthenticated, isLoading } from useAuth()
  ├── isLoading=true  → <Spinner size="lg" />
  ├── !isAuthenticated → <Navigate to={redirectTo} replace />
  └── isAuthenticated → {children}
```

---

### ModuleLoader (in `apps/shell`)

**Type**: React component  
**Responsibility**: Wrap Module Federation remote imports with loading + error handling

```
ModuleLoader({ remote, fallback? })
  ├── Lazy = React.lazy(() => import(remote))
  ├── <ErrorBoundary fallback={<ErrorMessage onRetry={retry}/>}>
  │     └── <Suspense fallback={<Spinner/>}>
  │           └── <Lazy />
  └── retry: calls reset on ErrorBoundary + re-attempts import
```

---

### GlobalErrorBoundary (in `apps/shell`)

**Type**: React class component (Error Boundary requires class)  
**Responsibility**: Last-resort catch-all; fail-closed with generic message

```
GlobalErrorBoundary
  ├── componentDidCatch(error, info):
  │     └── logger.error('Unhandled render error', { component: info.componentStack })
  │         // No stack trace logged in production; only component stack (no PII)
  └── render:
        ├── if hasError:
        │     └── <ErrorMessage message="Something went wrong." />
        │         + Refresh button: window.location.reload()
        └── else: {children}
```

---

## Session Management Design

| Attribute | Value / Decision |
|---|---|
| Session duration | 7 days (set as `Max-Age` on the httpOnly cookie by the backend) |
| Frontend awareness | Frontend does NOT track expiry — relies on 401 from backend when cookie expires |
| Re-authentication | 401 interceptor fires → clear local user → redirect to login |
| Concurrent tabs | All tabs share the same localStorage user profile; all will redirect on 401 |
| Logout propagation | `localStorage.removeItem` + `navigate('/auth/login')` — other tabs detect next API call 401 |

---

## CORS Design

| Attribute | Decision |
|---|---|
| CORS ownership | Backend controls `Access-Control-Allow-Origin` — frontend has no role |
| Frontend config | `withCredentials: true` on all `apiClient` requests (sends httpOnly cookie cross-origin) |
| Wildcard origin | Backend MUST NOT use `Access-Control-Allow-Origin: *` on authenticated endpoints (SECURITY-08) |
| Allowed origins | Backend must allowlist the deployed SPA origin(s); exact values set at Infrastructure Design |
