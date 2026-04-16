# Code Summary — U-01: Shell & Shared Infrastructure

## Files Created

### Monorepo Root
- `package.json` — pnpm workspaces root, Turborepo scripts
- `pnpm-workspace.yaml` — workspace package paths
- `turbo.json` — Turborepo pipeline (build, type-check, lint, test)
- `tsconfig.base.json` — shared TypeScript strict config
- `.gitignore`
- `.env.example` — documents all required env vars
- `.npmrc`

### `packages/@app/ui` — Chinoiserie Design System
- `tailwind.config.ts` — full palette (jade, porcelain, gold, ivory, ink), semantic tokens, component tokens, typography
- `src/components/` — Button, Input, Card, Badge, Dialog, Spinner, ErrorMessage, EmptyState, DecorativeDivider (all with tests)
- `src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `src/index.ts` — public API barrel
- `vitest.config.ts`, `src/test-setup.ts`

### `packages/@app/auth` — Auth Shared Library
- `src/types.ts` — User, AuthState, LoginRequest, LoginResponse, etc.
- `src/tokenStorage.ts` — localStorage abstraction (user profile only, not JWT)
- `src/AuthService.ts` — login, register, logout, requestPasswordReset, resetPassword, validateToken
- `src/AuthContext.tsx` — React context definition
- `src/AuthProvider.tsx` — session restore (BR-AUTH-01), login flow, logout flow
- `src/useAuth.ts` — context hook
- `src/withAuthGuard.tsx` — HOC route guard
- All above have corresponding `.test.ts(x)` files

### `packages/@app/api-client` — HTTP Client + Services
- `src/ApiError.ts` — typed error class (statusCode, errorCode, message)
- `src/logger/` — Logger (pluggable transport), ConsoleTransport, types
- `src/apiClient.ts` — Axios instance (withCredentials, interceptors, 401 handler, correlation ID)
- `src/services/ProjectsApiService.ts` — CRUD endpoints
- `src/services/ReportsApiService.ts` — status + report data endpoints
- `src/services/CanvaApiService.ts` — 2-step Canva generation endpoints
- `src/sseClient.ts` — EventSource factory for project status SSE stream
- All services have corresponding `.test.ts` files

### `apps/shell` — Module Federation Host
- `webpack.config.ts` — MF host, 4 remotes, shared singletons
- `index.html` — Google Fonts with SRI hash placeholder
- `src/main.tsx` — React root mount
- `src/App.tsx` — AuthProvider + BrowserRouter + GlobalErrorBoundary
- `src/router/routes.ts` — RouteConfig definitions
- `src/router/AppRouter.tsx` — lazy MFE routes, protected/public separation
- `src/components/AuthGuard.tsx` — deny-by-default, loading spinner, redirect (US-AUTH-02)
- `src/components/ModuleLoader.tsx` — error boundary + retry for MFE remote failures
- `src/components/GlobalErrorBoundary.tsx` — top-level catch-all (SECURITY-15)
- `src/components/layout/GlobalLayout.tsx` — sidebar + main area
- `src/components/layout/Sidebar.tsx` — collapsible, persists to localStorage
- `src/components/layout/SidebarLogo.tsx` — Chinoiserie brand mark
- `src/components/layout/SidebarNav.tsx` — Projects nav, aria-current, active highlight
- `src/components/layout/SidebarUserSection.tsx` — user email, logout button (US-AUTH-03)
- `src/components/layout/SidebarToggle.tsx` — expand/collapse
- Tests: AuthGuard, GlobalErrorBoundary, Sidebar, SidebarNav, GlobalLayout

### Infrastructure
- `infra/terraform/main.tf` — provider, backend, module wiring
- `infra/terraform/variables.tf`, `outputs.tf`, `terraform.tfvars.prod`
- `infra/terraform/modules/s3-hosting/main.tf` — S3 + OAC + encryption + public access block
- `infra/terraform/modules/cloudfront/main.tf` — distribution, security headers policy (CSP, HSTS, etc.), cache behaviours
- `infra/terraform/modules/iam-deploy/main.tf` — least-privilege IAM user + policy

### CI/CD
- `.github/workflows/pr-checks.yml` — type-check, lint, test, audit on every PR
- `.github/workflows/deploy.yml` — validate → build → S3 sync → CloudFront invalidation on main push

## Stories Implemented
- US-AUTH-02 ✅ (AuthGuard, AuthProvider session restore, AuthService.login)
- US-AUTH-03 ✅ (SidebarUserSection logout button, AuthService.logout)
