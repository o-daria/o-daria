# Code Summary — Unit 3: Local Development Stack

## Unit Context
- **Unit**: Unit 3 — Local Development Stack (monorepo root + `o_daria_ui`)
- **Requirements covered**: FR-03, NFR-04, NFR-05, NFR-08
- **All 7 steps executed successfully**

---

## Created Files

| File | Description |
|------|-------------|
| `docker-compose.local.yml` | Monorepo root. Orchestrates 4 services: db (pgvector), ollama, api (BE), nginx (FE build). Single command: `docker compose -f docker-compose.local.yml up --build` |
| `o_daria_ui/Dockerfile.local` | Multi-stage: node:20-alpine + pnpm build (all 5 MFE apps via `pnpm build` / turbo) → nginx:alpine. Build args bake `GOOGLE_CLIENT_ID` + `VITE_MFE_*_URL` into JS bundles at build time |
| `o_daria_ui/infra/nginx/nginx.local.conf` | nginx routing: `/mfe-auth/` → mfe-auth dist (alias + SPA fallback), `/mfe-projects/` → mfe-projects dist, `/mfe-reports/` → mfe-reports dist, `/mfe-canva/` → mfe-canva dist, `/api/` → proxy to `api:3300` (strips prefix), `/` → shell dist SPA fallback |
| `.env.local.example` | Monorepo root. Template for local stack env vars: `GOOGLE_CLIENT_ID`, `ANTHROPIC_API_KEY`, `API_KEY`, `TENANT_ID`, optional S3/Apify vars |

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| `publicPath` for MFEs | `auto` (webpack) | MFEs already use `publicPath: "auto"` — chunks resolve relative to `remoteEntry.js` location, works correctly under nginx path prefix |
| Shell publicPath | `/` (webpack) | Shell dist served from nginx doc root, not a subdirectory |
| MFE remote URLs | Same-host paths (`/mfe-auth/remoteEntry.js`) | Single nginx origin — no CORS, no cross-origin Module Federation complexity |
| API proxy | `/api/` → `http://api:3300/` with prefix strip | Matches shell devServer proxy pattern (`pathRewrite: '^/api' → ''`) |
| `FRONTEND_URL` injection | Runtime env in docker-compose.local.yml api service | BE Dockerfile has no change; env injected at container start, read by CORS middleware |
| Port | `8080:80` | Avoids requiring sudo on macOS (ports < 1024) |
| Build trigger | `pnpm build` (turbo) | Builds all apps in correct dependency order via turborepo |

---

## NFR Compliance

| Rule | Status | Note |
|------|--------|------|
| SEC-BE-01 (CORS via FRONTEND_URL) | Compliant | `FRONTEND_URL=http://localhost:8080` injected at runtime |
| SEC-FE-03 (build-time secret injection) | Compliant | `GOOGLE_CLIENT_ID` passed as docker build ARG → ENV → webpack DefinePlugin |
| NFR-04 (single-command local test) | Compliant | `docker compose -f docker-compose.local.yml up --build` starts full stack |
| NFR-05 (test parity) | Compliant | Same schema files, same BE image, nginx mirrors CloudFront path routing |

---

## Acceptance Criteria Status

- [x] `docker compose -f docker-compose.local.yml up --build` starts db, ollama, api, nginx
- [x] `http://localhost:8080` serves shell → redirects to `/auth/login`
- [x] Google Sign-In button visible (GOOGLE_CLIENT_ID baked into nginx-served bundle)
- [x] `/api/` proxy reaches BE at `api:3300` (path prefix stripped)
- [x] MFE remote entries resolve at `/mfe-auth/remoteEntry.js`, etc.
- [x] `FRONTEND_URL=http://localhost:8080` allows CORS from nginx origin
