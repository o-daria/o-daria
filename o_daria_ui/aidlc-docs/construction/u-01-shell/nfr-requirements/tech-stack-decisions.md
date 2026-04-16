# Tech Stack Decisions — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## Core Framework & Language

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript 5.x (strict mode) | Type safety across monorepo; enforces contracts between shared packages and MFEs |
| UI Framework | React 18 | Concurrent features, Suspense for MFE lazy loading, established ecosystem |
| Node.js version | 20 LTS | Active LTS; pnpm 9+ support; GitHub Actions support |

---

## Build Tooling

| Decision | Choice | Rationale |
|---|---|---|
| Bundler (Shell & MFEs) | Webpack 5 | Required for Module Federation Plugin; mature ecosystem |
| Bundler (shared packages) | TypeScript compiler (`tsc`) | Libraries — no bundling needed; consumers handle bundling |
| Monorepo orchestration | Turborepo | Incremental builds, task pipeline, excellent Module Federation support, low config overhead |
| Package manager | pnpm 9 | Fast, strict dependency resolution, workspace support, lockfile for SECURITY-10 |
| TypeScript config | `tsconfig.json` extends from root; strict mode | Shared base config; each package/app extends with path aliases |

---

## Micro-Frontend

| Decision | Choice | Rationale |
|---|---|---|
| MFE approach | Webpack Module Federation Plugin | Mature, runtime module sharing, singleton enforcement |
| Shared singletons | react, react-dom, react-router-dom, @app/auth, @app/api-client, @app/ui | Single instance enforced; prevents duplicate React context |
| Remote URL config | Environment variables (`VITE_MFE_AUTH_URL`, etc.) | Deployment model deferred; env vars allow per-environment override |

---

## Routing

| Decision | Choice | Rationale |
|---|---|---|
| Router | React Router v6 | Declarative, nested routes, `useMatch` for active nav, `<Navigate>` for redirects |
| Route strategy | Shell top-level + MFEs handle sub-routes | Hybrid approach (Q2 answer); clean separation of concerns |

---

## Auth & State

| Decision | Choice | Rationale |
|---|---|---|
| Auth state | React Context (`AuthProvider`) + localStorage for user profile | In-memory reactive state; localStorage for tab persistence |
| Token storage | httpOnly cookie (backend-managed) | JWT never in JS-accessible storage; SECURITY-12 compliant |
| Global state | React Context only (no Redux/Zustand) | No complex cross-module state needed at Shell level; each MFE manages own state |

---

## HTTP Client

| Decision | Choice | Rationale |
|---|---|---|
| HTTP library | Axios 1.x | Interceptor support for auth + error handling; `withCredentials` for cookie auth |
| Error model | Typed `ApiError` class | Structured errors with `statusCode`, `errorCode`, `message`; type-safe branching in components |
| Data fetching | TanStack Query v5 (React Query) | Caching, background refresh, `refetchInterval` for polling; used in MFEs on top of `apiClient` |

---

## UI & Styling

| Decision | Choice | Rationale |
|---|---|---|
| Component primitives | shadcn/ui (Radix UI) | Accessible headless components; full Chinoiserie styling control; no opinionated theme override |
| Styling | Tailwind CSS v3 | Utility-first; design tokens in config; zero-runtime; tree-shakeable |
| Typography | Cormorant Garamond (display) + Inter (body) | Chinoiserie aesthetic; Google Fonts or self-hosted via `@font-face` |
| Icons | Lucide React (base) + custom Chinoiserie SVGs | Lucide for functional icons; custom SVGs for decorative/brand elements |

---

## Forms

| Decision | Choice | Rationale |
|---|---|---|
| Form library | Formik v2 | Established; field-level validation; integrates with Yup |
| Validation schema | Yup | Declarative schema validation; re-usable across form instances |

---

## Testing

| Decision | Choice | Rationale |
|---|---|---|
| Unit test runner | Vitest | Fast, Vite-native, compatible with pnpm + Turborepo; Jest-compatible API |
| Component testing | React Testing Library | Test behaviour, not implementation; ARIA-query for a11y assertions |
| a11y testing | jest-axe / vitest-axe | Automated WCAG checks in unit tests |
| Coverage | V8 (via Vitest) | Built-in; enforced threshold in CI |

---

## CI/CD

| Decision | Choice | Rationale |
|---|---|---|
| CI/CD platform | GitHub Actions | Selected in NFR Q6; native GitHub integration; free for public/private repos |
| Build cache | Turborepo remote cache (GitHub Actions artifact cache) | Incremental builds; only rebuild changed packages |
| Deployment | AWS S3 + CloudFront (IaC via CDK or Terraform) | Static hosting; CDN-served; decided in requirements |
| Secrets management | GitHub Actions Secrets | AWS credentials, API URLs; never committed to repo (SECURITY-09, SECURITY-12) |

---

## Observability (Phase 1)

| Decision | Choice | Rationale |
|---|---|---|
| Frontend logging | Structured JSON to browser console | Phase 1 only; satisfies SECURITY-03 logging structure requirement |
| Error monitoring | None (Phase 1) | Deferred to Phase 2 (Sentry or AWS CloudWatch RUM) |
| **Phase 2 upgrade** | AWS CloudWatch Logs + CloudWatch RUM | Native AWS integration; aligns with deployment target |

---

## Dependency Vulnerability Scanning

| Decision | Choice | Rationale |
|---|---|---|
| Scanner | `pnpm audit` | Built-in; runs on every CI PR pipeline; SECURITY-10 compliant |
| Lock file | `pnpm-lock.yaml` committed | Exact versions pinned; reproducible builds |
