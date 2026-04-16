# Build and Test Summary

# Marketing Audience Analysis Platform (ui)

## Build Configuration

- **Build Tool**: Turborepo 2.3.3 + Webpack 5 per app + tsc per package
- **Package Manager**: pnpm 10.33.0
- **Node requirement**: >= 20.0.0

## Build Artifacts

| Package / App     | Artifact Path                                | Type                  |
| ----------------- | -------------------------------------------- | --------------------- |
| `@app/auth`       | `packages/@app/auth/dist/`                   | TypeScript library    |
| `@app/api-client` | `packages/@app/api-client/dist/`             | TypeScript library    |
| `@app/ui`         | `packages/@app/ui/dist/`                     | Component library     |
| `shell`           | `apps/shell/dist/` + `remoteEntry.js`        | MF host               |
| `mfe-auth`        | `apps/mfe-auth/dist/` + `remoteEntry.js`     | MF remote (port 3001) |
| `mfe-projects`    | `apps/mfe-projects/dist/` + `remoteEntry.js` | MF remote (port 3002) |
| `mfe-reports`     | `apps/mfe-reports/dist/` + `remoteEntry.js`  | MF remote (port 3003) |
| `mfe-canva`       | `apps/mfe-canva/dist/` + `remoteEntry.js`    | MF remote (port 3004) |

---

## Unit Tests

| Package / App       | Test Files | Status                                                            |
| ------------------- | ---------- | ----------------------------------------------------------------- |
| `@app/api-client`   | 7          | Ready — `ProjectsApiService.test.ts` updated to real API contract |
| `apps/shell`        | 5          | Ready                                                             |
| `apps/mfe-auth`     | 0          | No unit tests — covered by shell auth integration                 |
| `apps/mfe-projects` | 0          | Manual integration coverage via MSW                               |
| `apps/mfe-reports`  | 0          | Manual integration coverage via MSW                               |
| `apps/mfe-canva`    | 0          | Manual integration coverage via MSW                               |

Run with: `pnpm test`

---

## Integration Tests

| Scenario                                 | Method               | Status  |
| ---------------------------------------- | -------------------- | ------- |
| Shell loads all MFE remotes              | Manual browser       | Defined |
| Create project → report displayed inline | Manual browser + MSW | Defined |
| ReportPanel standalone                   | Manual browser + MSW | Defined |
| Canva Panel generates presentation       | Manual browser + MSW | Defined |
| Delete project                           | Manual browser + MSW | Defined |

See `integration-test-instructions.md` for step-by-step execution.

---

## Performance Tests

| Test                                  | Status                       |
| ------------------------------------- | ---------------------------- |
| Bundle size audit (Webpack analyzer)  | Informational / N/A blocking |
| Lighthouse initial load               | Informational / N/A blocking |
| Backend API latency (`POST /reports`) | Backend-owned / N/A blocking |

---

## Security Tests (Extension: Security Baseline ENABLED)

| Check                      | Guidance                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Dependency vulnerabilities | `pnpm audit` — address high/critical before production                                  |
| Auth token storage         | `tokenStorage` uses `sessionStorage` (not localStorage) per security baseline           |
| CSP headers                | Set by deployment layer — not enforced in dev                                           |
| XSS                        | All user content rendered via React (auto-escaped); no `dangerouslySetInnerHTML`        |
| Hardcoded dev token        | `Authorization: Bearer ramsey-packado` is MVP-only — must be replaced before production |

---

## Contract Tests

N/A — single backend API, contract defined in `POST /reports` spec within `u-03-04-05-code-generation-plan.md`.

---

## E2E Tests

Not in scope for MVP. Manual browser integration (see `integration-test-instructions.md`) provides equivalent coverage.

---

## Overall Status

| Area                 | Status                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Build                | Ready to run (`pnpm build`)                                         |
| Unit Tests           | Ready to run (`pnpm test`)                                          |
| Integration Tests    | Defined — execute manually                                          |
| Performance          | Informational                                                       |
| Security             | Baseline addressed; hardcoded token must be replaced pre-production |
| Ready for Operations | Yes (with noted pre-production items)                               |

## Pre-Production Checklist

- [ ] Replace `Authorization: Bearer ramsey-packado` with real auth token flow
- [ ] Run `pnpm audit` and patch high/critical vulnerabilities
- [ ] Set `Content-Security-Policy` headers at the CDN/server layer
- [ ] Configure real MFE remote URLs via environment variables (not defaults)
- [ ] Initialise MSW service worker files (`msw init public/`) in each app's `public/` before deploying (or remove MSW from production builds)
