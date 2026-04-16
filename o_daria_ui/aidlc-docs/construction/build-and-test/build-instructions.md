# Build Instructions
# Marketing Audience Analysis Platform (o_daria_ui)

## Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0 (exact: 10.33.0 as declared in `packageManager`)
- **Build tool**: Turborepo 2.3.3 (orchestrates Webpack per-app + tsc per-package)

## Environment Variables

No `.env` file is required for a local dev/MSW build. The following variables have defaults in webpack configs:

| Variable | Default | Used By |
|---|---|---|
| `VITE_MFE_AUTH_URL` | `http://localhost:3001/remoteEntry.js` | shell |
| `VITE_MFE_PROJECTS_URL` | `http://localhost:3002/remoteEntry.js` | shell |
| `VITE_MFE_REPORTS_URL` | `http://localhost:3003/remoteEntry.js` | mfe-projects |
| `VITE_MFE_CANVA_URL` | `http://localhost:3004/remoteEntry.js` | mfe-projects |

## Build Steps

### 1. Install Dependencies

```bash
corepack enable        # activate pnpm via corepack (once per machine)
pnpm install           # installs all workspace packages
```

### 2. Build All Packages and Apps

```bash
pnpm build
```

Turborepo executes this pipeline:

```
Phase 1 (parallel):  @app/auth  |  @app/api-client  |  @app/ui
Phase 2 (parallel):  shell
Phase 3 (parallel):  mfe-auth  |  mfe-projects  |  mfe-reports  |  mfe-canva
```

Each app runs `webpack --mode production`; each package runs `tsc`.

### 3. Verify Build Success

Expected output per package:

| Package / App | Build Artifact |
|---|---|
| `packages/@app/auth` | `dist/` (TypeScript compiled) |
| `packages/@app/api-client` | `dist/` (TypeScript compiled) |
| `packages/@app/ui` | `dist/` (TypeScript compiled) |
| `apps/shell` | `dist/` + `dist/remoteEntry.js` |
| `apps/mfe-auth` | `dist/` + `dist/remoteEntry.js` |
| `apps/mfe-projects` | `dist/` + `dist/remoteEntry.js` |
| `apps/mfe-reports` | `dist/` + `dist/remoteEntry.js` |
| `apps/mfe-canva` | `dist/` + `dist/remoteEntry.js` |

Terminal should show `Tasks: 8 successful` (or similar Turbo summary).

### 4. Type-Check Only (fast validation)

```bash
pnpm type-check
```

### 5. Run All Apps in Dev Mode (with MSW)

Start all apps with hot reload. Each starts its own webpack-dev-server and MSW service worker:

```bash
pnpm dev
```

Then open:
- Shell (host): http://localhost:3000
- mfe-auth (standalone): http://localhost:3001
- mfe-projects (standalone): http://localhost:3002
- mfe-reports (standalone): http://localhost:3003
- mfe-canva (standalone): http://localhost:3004

> MSW service worker must be registered in the browser — first load may show a console message about missing `mockServiceWorker.js`. Copy it with:
> ```bash
> pnpm --filter shell exec msw init public/ --save
> pnpm --filter mfe-auth exec msw init public/ --save
> pnpm --filter mfe-reports exec msw init public/ --save
> pnpm --filter mfe-canva exec msw init public/ --save
> ```

## Troubleshooting

### Dependency resolution errors
```bash
pnpm install --frozen-lockfile=false
```

### TypeScript path alias errors (`@app/*` not found)
Ensure all `packages/@app/*` have been built before building apps:
```bash
pnpm --filter @app/auth build && pnpm --filter @app/api-client build && pnpm --filter @app/ui build
```

### Module Federation remote not found at runtime
Verify all MFE dev servers are running. Each remote must be reachable at its configured URL before the shell loads it.
