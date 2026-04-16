# NFR Design Patterns — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## 1. Resilience Patterns

### 1.1 Error Boundary Cascade (SECURITY-15)

**Pattern**: Layered error boundaries — module-level catch + global Shell fallback.

```
GlobalErrorBoundary (Shell)           ← final safety net; catches anything that escapes modules
  └── ModuleLoader ErrorBoundary      ← per-MFE remote load failure
        └── [MFE module]
              └── MFE-level ErrorBoundary (defined in each MFE unit)
```

**Behaviour at each level**:

| Boundary | What it catches | User experience |
|---|---|---|
| MFE ErrorBoundary | Render errors inside a specific MFE | Error panel inside the module area; rest of Shell intact |
| ModuleLoader ErrorBoundary | Webpack Module Federation remote load failure | "Failed to load module" with Retry button; rest of Shell intact |
| GlobalErrorBoundary | Any uncaught error that escapes all inner boundaries | Full-page generic error with Refresh button |

**Fail-closed rule**: On any error, the boundary denies access to the broken component and shows a safe fallback. It never fails open.

---

### 1.2 API Error — No Retry (Fail Fast)

**Pattern**: Fail immediately on any API error; surface error state to the component.

**Rationale**: Retries are not implemented at the `apiClient` level. The application is small-scale (< 50 users), and automatic retries on 5xx could mask real backend issues. Components use React Query's built-in `retry: false` config.

**Error propagation flow**:
```
apiClient request fails
    → throws ApiError(statusCode, errorCode, message)
    → React Query catches → sets query.error
    → Component renders <ErrorMessage> with retry button (user-triggered)
```

---

### 1.3 Auth Session Recovery

**Pattern**: Passive session recovery on 401 — no silent token refresh.

```
API call returns 401
    → apiClient interceptor fires
    → Clear localStorage['app.user']
    → Navigate to /auth/login
    → User re-authenticates
    → Redirect to /projects
```

**Session expiry**: 7 days (set by backend on the httpOnly cookie). Frontend does not manage expiry — relies on backend cookie max-age and 401 response.

---

## 2. Performance Patterns

### 2.1 MFE Lazy Loading with Suspense

**Pattern**: All Module Federation remotes loaded on-demand via `React.lazy` + `<Suspense>`.

```typescript
// Shell AppRouter — each remote is a lazy import
const AuthModule     = React.lazy(() => import('mfe_auth/Module'));
const ProjectsModule = React.lazy(() => import('mfe_projects/Module'));
const ReportsModule  = React.lazy(() => import('mfe_reports/Module'));
const CanvaModule    = React.lazy(() => import('mfe_canva/Module'));
```

**Impact**: Shell initial bundle contains only: Shell components, `@app/auth`, routing logic. MFE bundles load only when the user navigates to that route.

---

### 2.2 Shared Singleton Deduplication

**Pattern**: Webpack Module Federation `shared` config enforces singleton instances.

**Effect**: `react`, `react-dom`, `@app/auth`, `@app/api-client`, `@app/ui` are loaded once and shared across all remotes. Eliminates duplicate context instances and multiple React trees.

---

### 2.3 Font Loading Strategy

**Pattern**: Google Fonts CDN with SRI integrity attributes.

**Decision updated at Infrastructure Design**: Fonts loaded from Google Fonts CDN (not self-hosted). This requires:
1. CSP `font-src` and `style-src` must allowlist `fonts.googleapis.com` and `fonts.gstatic.com`
2. `<link>` tags for Google Fonts **MUST** include `integrity` (SRI hash) and `crossorigin="anonymous"` attributes per SECURITY-13
3. `font-display: swap` specified via the Google Fonts URL parameter (`&display=swap`)

```html
<!-- Shell index.html — Google Fonts with SRI -->
<link
  rel="preconnect"
  href="https://fonts.googleapis.com"
  crossorigin="anonymous"
/>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@400;500&display=swap"
  integrity="sha384-[HASH_TO_BE_GENERATED_AT_BUILD_TIME]"
  crossorigin="anonymous"
/>
```

**Note**: SRI hash must be generated at build time using `openssl dgst -sha384` on the fetched CSS resource and updated in CI when font variants change.

---

### 2.4 Tailwind CSS Purging

**Pattern**: Tailwind CSS JIT mode with content scanning across all workspaces.

```javascript
// @app/ui/tailwind.config.ts
content: [
  './src/**/*.{ts,tsx}',
  '../../apps/**/*.{ts,tsx}',  // scan all MFE source files
]
```

**Effect**: Production build contains only used CSS classes — zero unused utility classes shipped.

---

## 3. Security Patterns

### 3.1 Authentication Guard Pattern (SECURITY-08)

**Pattern**: Route-level auth enforcement via `AuthGuard` HOC.

```
Protected route render:
  isLoading=true  → Spinner (wait; never redirect prematurely)
  isAuth=false    → <Navigate to="/auth/login" replace />
  isAuth=true     → render children
```

**Deny-by-default**: All routes are protected unless explicitly marked `isPublic: true` in `RouteConfig`. Adding a new route does NOT give it public access — the developer must explicitly opt out of protection.

---

### 3.2 Reverse Auth Guard (Authenticated Redirect)

**Pattern**: Auth pages redirect authenticated users away.

```
User navigates to /auth/login while authenticated
    → AuthModule checks useAuth().isAuthenticated
    → Redirects to /projects
```

Prevents session confusion and double-login.

---

### 3.3 Token Containment (SECURITY-12)

**Pattern**: JWT lives exclusively in the httpOnly cookie set by the backend. JS layer is intentionally prevented from reading it.

**What the JS layer stores** (localStorage only):
```typescript
{
  "app.user": { "id": "...", "email": "...", "createdAt": "..." }
}
// No tokens. No session IDs. No refresh tokens.
```

**What happens on tampered/corrupted localStorage**:
- `AuthProvider` on mount: parse fails → clear key → treat as unauthenticated → redirect to login
- No silent failure or partial auth state

---

### 3.4 Generic Error Surface (SECURITY-09, SECURITY-15)

**Pattern**: All user-visible error messages are generic strings. `ApiError.message` is a safe string set by the frontend error handler — it never includes `errorCode`, `statusCode`, backend stack traces, or internal paths.

```typescript
// Error surface rule:
// ✅ Show: "Something went wrong. Please try again."
// ✅ Show: "Invalid email or password."   (auth-specific, safe)
// ❌ Never show: error.stack
// ❌ Never show: "SQL error: column 'user_id' does not exist"
// ❌ Never show: ApiError.errorCode to end user
```

---

### 3.5 Content Security Policy (Deferred)

**Status**: Full CSP policy definition deferred to Infrastructure Design stage.

**Phase 1 placeholder**: A permissive development CSP will be used during development. The final restrictive policy will be defined in the CloudFront response headers policy at Infrastructure Design.

**Constraint recorded**: Fonts are self-hosted (see 2.3) to allow a strict `'self'`-only font-src directive when CSP is finalised.

---

### 3.6 HTTP Security Headers (SECURITY-04)

Headers enforced via CloudFront Response Headers Policy (defined at Infrastructure Design). Design records the required values:

| Header | Target Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Deferred to Infrastructure Design |

---

## 4. Observability Pattern — Pluggable Logger

**Pattern**: Logger singleton with pluggable transport interface (Strategy pattern).

**Phase 1**: Console transport.  
**Phase 2**: CloudWatch transport — swap transport without changing any call sites.

```typescript
interface LogTransport {
  log(entry: LogEntry): void;
}

interface LogEntry {
  timestamp: string;      // ISO 8601
  level: 'info' | 'warn' | 'error';
  correlationId: string;  // UUID per browser session, set once on app init
  message: string;
  context?: Record<string, unknown>;  // structured metadata — no PII
}

class Logger {
  constructor(private transport: LogTransport) {}
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

// Phase 1
const logger = new Logger(new ConsoleTransport());

// Phase 2 upgrade (no call site changes):
const logger = new Logger(new CloudWatchTransport(endpoint));
```

**Correlation ID**: Generated once on app init (`crypto.randomUUID()`), stored in module scope, included in every log entry and every outgoing API request header (`X-Correlation-ID`).
