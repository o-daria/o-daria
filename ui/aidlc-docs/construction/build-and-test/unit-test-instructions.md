# Unit Test Execution Instructions

# Marketing Audience Analysis Platform (ui)

## Test Framework

- **Runner**: Vitest 2.1.8 (per package/app)
- **DOM**: jsdom
- **React**: @testing-library/react 16.1.0
- **HTTP mocking**: axios-mock-adapter (api-client), MSW (app-level)

---

## Run All Unit Tests

```bash
pnpm test
```

Turborepo runs `vitest run` in each package/app in dependency order.

---

## Run Tests per Package / App

```bash
# Shared packages
pnpm --filter @app/api-client test
pnpm --filter @app/auth test
pnpm --filter @app/ui test

# Apps
pnpm --filter shell test
pnpm --filter mfe-auth test
pnpm --filter mfe-projects test
pnpm --filter mfe-reports test
pnpm --filter mfe-canva test
```

---

## Run with Coverage

```bash
pnpm test:coverage
```

Coverage reports written to each package's `coverage/` directory.

---

## Test Inventory

### `packages/@app/api-client`

| Test File                             | What It Tests                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `ApiError.test.ts`                    | ApiError class construction and message formatting                                    |
| `apiClient.test.ts`                   | Axios interceptors, base URL, error propagation                                       |
| `sseClient.test.ts`                   | SSE EventSource lifecycle and onStatusChange callbacks                                |
| `logger/Logger.test.ts`               | Logger level filtering and transport dispatch                                         |
| `services/ProjectsApiService.test.ts` | `createProject` → `POST /reports` with real payload; mapping to `Project`; CRUD stubs |
| `services/ReportsApiService.test.ts`  | `getReportStatus`, `getReportData`                                                    |
| `services/CanvaApiService.test.ts`    | `canvaSetup`, `canvaGenerate`                                                         |

### `apps/shell`

| Test File                      | What It Tests                                                        |
| ------------------------------ | -------------------------------------------------------------------- |
| `AuthGuard.test.tsx`           | Redirects unauthenticated users; renders children when authenticated |
| `GlobalErrorBoundary.test.tsx` | Catches render errors, displays fallback UI                          |
| `GlobalLayout.test.tsx`        | Layout structure with sidebar and outlet                             |
| `Sidebar.test.tsx`             | Navigation links rendering                                           |
| `SidebarNav.test.tsx`          | Active link highlighting                                             |

---

## Expected Results

- All tests should pass with 0 failures
- Acceptable warnings: Vitest may warn about `canvas` not being available in jsdom — this is expected and non-blocking

---

## Fix Failing Tests

1. Run failing package in isolation:
   ```bash
   pnpm --filter @app/api-client test -- --reporter=verbose
   ```
2. Check if test uses stale type names (`brandValues`, `audienceSocialMediaProfiles`) — update to current API contract (`brand_input`, `handles`)
3. Check if mock endpoint matches updated service (`/reports` not `/projects` for create)
