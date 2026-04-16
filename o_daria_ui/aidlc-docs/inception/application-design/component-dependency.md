# Component Dependency Map
# Marketing Audience Analysis Platform (o_daria_ui)

**Version**: 1.0  
**Date**: 2026-04-07

---

## Dependency Matrix

| Consumer | Depends On | Type | Communication Pattern |
|---|---|---|---|
| `shell` | `@app/auth` | Shared lib | Import — reads auth state, mounts AuthGuard |
| `shell` | `@app/ui` | Shared lib | Import — shared layout components |
| `shell` | `mfe-auth` | MFE Remote | Webpack Module Federation dynamic import |
| `shell` | `mfe-projects` | MFE Remote | Webpack Module Federation dynamic import |
| `shell` | `mfe-reports` | MFE Remote | Webpack Module Federation dynamic import |
| `shell` | `mfe-canva` | MFE Remote | Webpack Module Federation dynamic import |
| `mfe-auth` | `@app/auth` | Shared lib | Import — calls AuthService, uses useAuth hook |
| `mfe-auth` | `@app/ui` | Shared lib | Import — Button, Input, ErrorMessage |
| `mfe-projects` | `@app/api-client` | Shared lib | Import — ProjectsApiService + React Query |
| `mfe-projects` | `@app/auth` | Shared lib | Import — useAuth (get current user ID) |
| `mfe-projects` | `@app/ui` | Shared lib | Import — Card, Badge, Button, Dialog, EmptyState |
| `mfe-reports` | `@app/api-client` | Shared lib | Import — ReportsApiService + sseClient |
| `mfe-reports` | `@app/ui` | Shared lib | Import — Card, Spinner, ErrorMessage |
| `mfe-canva` | `@app/api-client` | Shared lib | Import — CanvaApiService + React Query mutation |
| `mfe-canva` | `@app/ui` | Shared lib | Import — Button, Spinner, ErrorMessage |
| `@app/api-client` | `@app/auth` | Shared lib | Import — tokenStorage (auth token injection) |

---

## Dependency Diagram

```
                        +-----------+
                        |   shell   |  (Host / Orchestrator)
                        +-----------+
                         /  |  |  \
            MFE remote  /   |  |   \  MFE remote
                       v    |  |    v
               +----------+ |  | +-----------+
               | mfe-auth | |  | | mfe-canva |
               +----------+ |  | +-----------+
                             |  |
                MFE remote   |  |  MFE remote
                             v  v
                   +--------------+  +-------------+
                   | mfe-projects |  | mfe-reports |
                   +--------------+  +-------------+

                    All modules import from shared packages:

               +------------+  +------------------+  +--------+
               | @app/auth  |  | @app/api-client  |  | @app/ui|
               +------------+  +------------------+  +--------+
                    ^                  ^
                    |                  |
               @app/api-client depends on @app/auth (token injection)
```

---

## Module Federation Configuration

```
Host (shell):
  remotes:
    mfe-auth:     "mfe_auth@[mfe-auth-url]/remoteEntry.js"
    mfe-projects: "mfe_projects@[mfe-projects-url]/remoteEntry.js"
    mfe-reports:  "mfe_reports@[mfe-reports-url]/remoteEntry.js"
    mfe-canva:    "mfe_canva@[mfe-canva-url]/remoteEntry.js"
  shared:
    react:            { singleton: true, requiredVersion: "^18" }
    react-dom:        { singleton: true, requiredVersion: "^18" }
    react-router-dom: { singleton: true }
    @app/auth:        { singleton: true }
    @app/api-client:  { singleton: true }
    @app/ui:          { singleton: true }

Remotes (each MFE):
  exposes:
    "./Module": "./src/Module"   # default export: the MFE root component
  shared:
    (same shared list as host — singletons enforced)
```

---

## Data Flow Diagrams

### Authentication Flow

```
User → LoginPage (mfe-auth)
         → AuthService.login() (@app/auth)
           → apiClient POST /auth/login
             → Backend sets httpOnly cookie
               → AuthProvider updates context (shell)
                 → AuthGuard allows protected routes
```

### Project Creation → Report Flow

```
User → CreateProjectPage (mfe-projects)
         → ProjectsApiService.createProject()
           → Backend creates project (status: DRAFT)
             → Backend transitions to PROCESSING + calls external analysis API
               → SSE stream opened (mfe-reports useProjectStatusSSE)
                 → Backend sends status: REPORT_READY event
                   → ReportPanel fetches ReportData
                     → ReportCardGrid renders summary cards
```

### Canva Generation Flow

```
User → GenerateButton click (mfe-canva)
         → canvaApi.canvaSetup({ projectId })  [Step 1]
           → On success → canvaApi.canvaGenerate({ projectId, sessionToken })  [Step 2]
             → On success → CanvaLinkDisplay renders link
               → User clicks link → opens Canva in new tab
```

---

## Communication Rules

| Rule | Description |
|---|---|
| No direct MFE-to-MFE imports | MFEs never import from each other; all cross-cutting concerns go through shared packages |
| Singleton shared libs | `react`, `react-dom`, `@app/auth`, `@app/api-client`, `@app/ui` are singletons in Module Federation config |
| Props over events for co-located slots | `ProjectDetailPage` passes `projectId` as a prop to `ReportPanel` and `CanvaPanel` (rendered in the same route via module federation dynamic import) |
| Auth state read-only in MFEs | MFEs read auth state via `useAuth()`; only `mfe-auth` calls AuthService mutation methods |
| No direct `localStorage` access | Token access is abstracted through `@app/auth`'s `tokenStorage`; no module accesses localStorage directly |
