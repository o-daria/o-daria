# Build and Test Summary

## Overview

All 4 construction units are complete. This document summarises the recommended test execution order and the definition of "done" for first customer review.

---

## Recommended Execution Order

```
Step 1  BE unit tests (fast, no external deps)
Step 2  FE type-check + unit tests (fast, no external deps)
Step 3  Local stack build + smoke test (requires Docker)
Step 4  Integration tests against local stack (requires running local stack)
Step 5  AWS apply + production smoke (requires AWS credentials)
```

---

## Step-by-Step Checklist

### Step 1 — BE unit tests

```bash
cd api && npm test
```

**Pass criteria:**

- [ ] All existing tests pass (no regressions)
- [ ] `POST /auth/google` tests pass (new auth endpoint)
- [ ] `authenticate` middleware tests pass (session token + API_KEY fallback)
- [ ] `src/safety/` tests: 100% pass (security invariants)

---

### Step 2 — FE type-check + unit tests

```bash
cd ui
pnpm type-check
GOOGLE_CLIENT_ID=placeholder pnpm build
pnpm test
```

**Pass criteria:**

- [ ] Zero TypeScript errors
- [ ] Build succeeds — `dist/` created for all 5 apps
- [ ] `@app/auth` tests pass: `tokenStorage`, `AuthProvider`, `AuthService`, `withAuthGuard`
- [ ] `@app/api-client` tests pass (unchanged — no regressions)
- [ ] `@app/ui` tests pass (unchanged — no regressions)

---

### Step 3 — Local stack + DB smoke

```bash
cp .env.local.example .env.local  # fill GOOGLE_CLIENT_ID + ANTHROPIC_API_KEY
docker compose -f docker-compose.local.yml up --build
```

**Pass criteria:**

- [ ] All 4 services start healthy (db, ollama, api, nginx)
- [ ] `http://localhost:8080` loads shell SPA
- [ ] `http://localhost:8080/auth/login` shows Google Sign-In button (no email/password)
- [ ] `curl http://localhost:8080/api/health` → `{"status":"ok"}`
- [ ] All 4 `remoteEntry.js` files return 200
- [ ] DB has `users` + `sessions` tables (schema_auth.sql applied)

---

### Step 4 — Integration tests

With local stack running, execute the integration tests from [integration-test-instructions.md](./integration-test-instructions.md):

**Pass criteria:**

- [ ] Test 1: Full Google Sign-In flow completes → `app.token` + `app.user` in localStorage
- [ ] Test 1b: Hard reload → session restored → stays on `/projects`
- [ ] Test 1c: Logout → localStorage cleared → `/auth/login`
- [ ] Test 1d: Direct navigation to protected route without token → redirect to login
- [ ] Test 2: 401 without token, 401 with wrong token, 200 with API_KEY, 200 with session token
- [ ] Test 3: All 4 MFE `remoteEntry.js` files return 200
- [ ] Test 4: CORS allows `localhost:8080`, blocks unknown origins
- [ ] Test 5: All expected tables present in DB

---

### Step 5 — AWS production deploy

Follow [build-instructions.md](./build-instructions.md) Unit 4 section.

**Pass criteria:**

- [ ] `terraform apply` succeeds — all resources created
- [ ] EC2 instance running, port 3300 accessible
- [ ] Port 22 blocked (security group)
- [ ] CloudFront domain returns shell SPA
- [ ] FE deploy workflow (`push` to `main`) completes — S3 sync + CF invalidation
- [ ] Google Sign-In works on CloudFront domain (authorized origin set in Google Cloud Console)
- [ ] `curl https://<ec2-dns>:3300/health` → `{"status":"ok"}`

---

## Definition of Done — First Customer Review

The product is ready for first customer review when:

| Requirement                                             | Verified By                                     | Status |
| ------------------------------------------------------- | ----------------------------------------------- | ------ |
| FR-01: Google Sign-In                                   | Integration Test 1                              | [ ]    |
| FR-02: Cost-efficient deploy (EC2 t4g.nano + single CF) | Step 5 + terraform apply                        | [ ]    |
| FR-03: Single-command local test                        | Step 3                                          | [ ]    |
| FR-04: S3 image storage                                 | Step 5 + s3-images bucket created               | [ ]    |
| FR-05: Unified Terraform                                | Step 5 + `infra/terraform/` apply               | [ ]    |
| NFR-01: Security baseline                               | Step 1 safety tests + Terraform SEC-INFRA rules | [ ]    |
| NFR-03: Docker restart always                           | Step 5 + EC2 systemd unit                       | [ ]    |
| NFR-04: Single-command local                            | Step 3                                          | [ ]    |
| NFR-05: Test parity (local ≈ prod)                      | Steps 3+4 vs Step 5                             | [ ]    |

---

## Known Limitations (acceptable for MVP)

| Limitation                                | Impact                                                        | Future Mitigation                                     |
| ----------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| No HTTPS on EC2 direct access             | API domain uses HTTP unless behind a custom domain + ACM cert | Add Route 53 + ACM certificate                        |
| EC2 SSH disabled — use SSM                | Debugging requires `aws ssm start-session`                    | Acceptable for MVP                                    |
| t4g.nano 512 MB RAM is tight              | May OOM if all services spike simultaneously                  | Upgrade to t4g.micro ($6/mo) if needed                |
| GHCR image pull required before EC2 boots | BE CI pipeline must push before first `terraform apply`       | Document in runbook                                   |
| Session tokens in DB (no refresh)         | 30-day expiry; no silent renewal                              | Add refresh tokens post-MVP                           |
| FE deploy workflow stays in `ui/.github/` | Not monorepo-root CI                                          | Migrate to root `.github/` when monorepo CI is set up |

---

## Files Created in Build and Test Stage

| File                                                                      | Purpose                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `aidlc-docs/construction/build-and-test/build-instructions.md`            | Build steps for all 4 units + AWS bootstrap                |
| `aidlc-docs/construction/build-and-test/unit-test-instructions.md`        | BE + FE unit + smoke test commands                         |
| `aidlc-docs/construction/build-and-test/integration-test-instructions.md` | 7 cross-unit integration tests                             |
| `aidlc-docs/construction/build-and-test/performance-test-instructions.md` | Baseline perf checks (bundle size, memory, response times) |
| `aidlc-docs/construction/build-and-test/build-and-test-summary.md`        | This file — checklist + definition of done                 |
