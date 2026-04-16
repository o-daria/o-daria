# Units of Work

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07  
**Repository**: Monorepo — pnpm workspaces + Turborepo  
**Architecture**: Webpack Module Federation SPA

---

## Repository Structure

```
ui/                          # monorepo root
  turbo.json                         # Turborepo pipeline config
  package.json                       # pnpm workspace root
  pnpm-workspace.yaml
  packages/
    @app/auth/                       # U-01: shared auth library
    @app/api-client/                 # U-01: shared HTTP client
    @app/ui/                         # U-01: shared Chinoiserie UI components
  apps/
    shell/                           # U-01: Module Federation host
    mfe-auth/                        # U-02: Auth micro-frontend
    mfe-projects/                    # U-03: Projects micro-frontend
    mfe-reports/                     # U-04: Reports micro-frontend
    mfe-canva/                       # U-05: Canva micro-frontend
```

---

## Unit Definitions

---

### U-01 — Shell & Shared Infrastructure

**Type**: Module Federation Host + Shared Package Foundation  
**Packages involved**:

- `apps/shell`
- `packages/@app/auth`
- `packages/@app/api-client`
- `packages/@app/ui`

**Responsibilities**:

- Configure Webpack Module Federation host (remote URL env vars, shared singletons)
- Define top-level React Router routes (`/auth/*`, `/projects/*`, etc.)
- Implement `GlobalLayout`, `AppRouter`, `AuthGuard`, `GlobalErrorBoundary`, `ModuleLoader`
- Build `@app/auth` shared library: `AuthProvider`, `useAuth`, `AuthService`, `tokenStorage`, `withAuthGuard`
- Build `@app/api-client` shared library: `apiClient` (axios instance, interceptors), `ProjectsApiService`, `ReportsApiService`, `CanvaApiService`, `sseClient`
- Build `@app/ui` shared library: Chinoiserie design system — shadcn/ui components + Tailwind config with jade/porcelain/gold/ivory tokens

**Build output**:

- `shell/dist/` — host app bundle + `remoteEntry.js`
- `@app/auth/dist/` — TypeScript compiled library
- `@app/api-client/dist/` — TypeScript compiled library
- `@app/ui/dist/` — TypeScript compiled component library

**Stories covered**: US-AUTH-02 (auth guard enforcement), US-AUTH-03 (logout via Shell)  
**Must be completed before**: U-02, U-03, U-04, U-05

---

### U-02 — Auth Micro-Frontend (`mfe-auth`)

**Type**: Webpack Module Federation Remote  
**Package**: `apps/mfe-auth`  
**Consumes**: `@app/auth`, `@app/ui`

**Responsibilities**:

- Implement `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`
- Expose `./Module` via Module Federation
- Call `AuthService` from `@app/auth` for all auth mutations
- Apply Formik + Yup validation to all auth forms
- Apply Chinoiserie styling via `@app/ui` components
- Implement `AuthErrorBoundary`

**Stories covered**: US-AUTH-01, US-AUTH-02, US-AUTH-03, US-AUTH-04  
**Depends on**: U-01

---

### U-03 — Projects Micro-Frontend (`mfe-projects`)

**Type**: Webpack Module Federation Remote  
**Package**: `apps/mfe-projects`  
**Consumes**: `@app/auth`, `@app/api-client`, `@app/ui`

**Responsibilities**:

- Implement `ProjectDashboard`, `ProjectCard`, `ProjectStatusBadge`
- Implement `CreateProjectPage`, `EditProjectPage`, `ProjectDetailPage`
- Implement `ProjectForm` (Formik + Yup), `SocialProfileList`, `DeleteProjectDialog`
- Implement `ProjectsErrorBoundary`
- Expose `./Module` via Module Federation
- Use React Query for all project data fetching and mutations
- Render `ReportPanel` (U-04) and `CanvaPanel` (U-05) as dynamic slots in `ProjectDetailPage`
- Apply Chinoiserie styling via `@app/ui` components

**Stories covered**: US-PROJ-01, US-PROJ-02, US-PROJ-03, US-PROJ-04, US-PROJ-05  
**Depends on**: U-01

---

### U-04 — Reports Micro-Frontend (`mfe-reports`)

**Type**: Webpack Module Federation Remote  
**Package**: `apps/mfe-reports`  
**Consumes**: `@app/api-client`, `@app/ui`

**Responsibilities**:

- Implement `ReportPanel`, `ProcessingState`, `ReportCardGrid`, `ReportSummaryCard`
- Implement `ReportErrorState`, `ReportsErrorBoundary`
- Implement `useProjectStatusSSE` hook (SSE connection to backend status stream)
- Implement `useReportData` React Query hook (fetch report data when REPORT_READY)
- Expose `./Module` via Module Federation
- Apply Chinoiserie styling via `@app/ui` components (cards, summary metrics)

**Stories covered**: US-REPORT-01  
**Depends on**: U-01  
**Note**: Requires backend SSE endpoint (`/projects/:id/status-stream`) from the external project

---

### U-05 — Canva Micro-Frontend (`mfe-canva`)

**Type**: Webpack Module Federation Remote  
**Package**: `apps/mfe-canva`  
**Consumes**: `@app/api-client`, `@app/ui`

**Responsibilities**:

- Implement `CanvaPanel`, `GenerateButton`, `GenerationProgress`
- Implement `CanvaLinkDisplay`, `CanvaErrorState`, `CanvaErrorBoundary`
- Implement `useCanvaGeneration` hook (sequential two-step mutation via React Query)
- Expose `./Module` via Module Federation
- Apply Chinoiserie styling via `@app/ui` components

**Stories covered**: US-CANVA-01  
**Depends on**: U-01  
**Note**: Canva API endpoint contracts (step 1 and step 2 request/response shapes) to be confirmed with backend team before code generation

---

## Code Organisation Strategy (Greenfield)

Each `apps/mfe-*` follows this internal structure:

```
mfe-{name}/
  src/
    components/        # React components
    hooks/             # Custom React hooks (React Query, SSE, etc.)
    services/          # Any module-specific service wrappers (if needed)
    pages/             # Page-level components (route targets)
    types/             # TypeScript types/interfaces local to this module
    Module.tsx         # MFE entry point — exposed via Module Federation
  webpack.config.ts    # Module Federation remote config
  tsconfig.json        # Extends root tsconfig
  package.json
```

Each `packages/@app/*` follows this structure:

```
packages/@app/{name}/
  src/
    index.ts           # Public API — all exports
    [feature files]
  dist/                # Compiled output (gitignored)
  tsconfig.json
  package.json
```

---

## Build Order (Turborepo Pipeline)

```
Phase 1 (parallel):  @app/auth  |  @app/api-client  |  @app/ui
Phase 2 (parallel):  shell
Phase 3 (parallel):  mfe-auth  |  mfe-projects  |  mfe-reports  |  mfe-canva
```

Turborepo `turbo.json` pipeline:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`^build` means: build all workspace dependencies first. MFEs depend on `@app/*` packages; shell depends on all.
