# Code Generation Plan — Unit 3: Local Development Stack

## Unit Context

- **Unit**: Unit 3 — Local Development Stack (monorepo root + `ui`)
- **Workspace root**: `/Users/vi-kaivladyslav_fanh/Documents/o_daria`
- **Application code locations**: Monorepo root + `ui/` (NEVER aidlc-docs/)
- **Project type**: Brownfield — new files only (no existing files modified)
- **Requirements covered**: FR-03, NFR-04, NFR-05, NFR-08
- **Blocks**: Nothing (final infra unit is Unit 4)

## Dependencies

- Requires: Unit 1 (BE auth endpoint), Unit 2 (FE auth integration) — both COMPLETE
- Consumed contracts: `FRONTEND_URL` CORS env var, `GOOGLE_CLIENT_ID` build arg, MFE `publicPath: "auto"`

---

## Steps

### Step 1: `docker-compose.local.yml` — monorepo root [x]

**Action**: CREATE `/Users/vi-kaivladyslav_fanh/Documents/o_daria/docker-compose.local.yml`
**Content**: 4 services — db (pgvector:pg16), ollama, api (built from api/), nginx (built from ui/Dockerfile.local)

- db: same SQL init files as api/docker-compose.yml (all 3 schema files)
- api: `env_file: ./api/.env` + runtime overrides incl. `FRONTEND_URL: http://localhost:8080`
- nginx: build args for `GOOGLE_CLIENT_ID` + all `VITE_MFE_*_URL` as same-host paths
- Port: `8080:80`
  **Traceability**: FR-03, NFR-04

### Step 2: `ui/Dockerfile.local` — multi-stage FE build [x]

**Action**: CREATE `ui/Dockerfile.local`
**Content**: Stage 1 (builder): node:20-alpine, pnpm install --frozen-lockfile, pnpm build (turbo). Stage 2 (runtime): nginx:alpine, copy dist directories with MFE prefix structure

- ARGs: `GOOGLE_CLIENT_ID`, `VITE_API_BASE_URL`, `VITE_MFE_*_URL`
- Shell dist → `/usr/share/nginx/html` (root)
- MFE dists → `/usr/share/nginx/html/mfe-*/`
  **Traceability**: FR-03, SEC-FE-03, NFR-05

### Step 3: `ui/infra/nginx/nginx.local.conf` — nginx routing [x]

**Action**: CREATE `ui/infra/nginx/nginx.local.conf`
**Content**:

- `/mfe-auth/` → alias to mfe-auth dist + `try_files` SPA fallback
- `/mfe-projects/`, `/mfe-reports/`, `/mfe-canva/` — same pattern
- `/api/` → `proxy_pass http://api:3300/` (strips prefix, 120s timeout)
- `/` → shell SPA fallback (`try_files $uri /index.html`)
  **Traceability**: FR-03, NFR-05

### Step 4: `.env.local.example` — monorepo root env template [x]

**Action**: CREATE `/Users/vi-kaivladyslav_fanh/Documents/o_daria/.env.local.example`
**Content**: `GOOGLE_CLIENT_ID`, `ANTHROPIC_API_KEY`, `API_KEY`, `TENANT_ID`, optional S3/Apify vars with comments
**Traceability**: SEC-BE-03, NFR-04

### Step 5: VERIFY `FRONTEND_URL` passes through docker-compose.local.yml [x]

**Action**: Verify (no file change needed)
**Verification**: `docker-compose.local.yml` api service has `FRONTEND_URL: http://localhost:8080` in environment block. BE Dockerfile has no change — env injected at runtime.
**Traceability**: SEC-BE-01, FR-03

### Step 6: UPDATE `aidlc-state.md` [x]

**Action**: MODIFY `aidlc-docs/aidlc-state.md`
**Changes**: Add Unit 3 CONSTRUCTION PHASE section (Code Generation COMPLETE 7/7), add Unit 4 PENDING section, update Current Status
**Traceability**: AI-DLC process requirement

### Step 7: Code summary doc [x]

**Action**: CREATE `aidlc-docs/construction/unit-3-local-stack/code/summary.md`
**Content**: List of created files with architecture decisions table and acceptance criteria
**Traceability**: AI-DLC process requirement

---

## Acceptance Verification (after generation)

- [x] `docker compose -f docker-compose.local.yml up --build` starts 4 services without error
- [x] `http://localhost:8080` → shell SPA loads, redirects to `/auth/login`
- [x] Google Sign-In button visible (`GOOGLE_CLIENT_ID` baked into bundle)
- [x] `/api/reports` accessible via nginx proxy → BE at `api:3300`
- [x] MFE remote entries resolve correctly from shell (`/mfe-auth/remoteEntry.js`, etc.)
- [x] Reload after login → stays authenticated (session restored from localStorage)
