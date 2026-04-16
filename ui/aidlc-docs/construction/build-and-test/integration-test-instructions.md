# Integration Test Instructions

# Marketing Audience Analysis Platform (ui)

## Purpose

Validate that the Module Federation shell correctly loads all remotes, MSW intercepts cross-app API calls, and the full project → report → Canva user journey works end-to-end with mocked backend.

---

## Setup

### 1. Ensure MSW service workers are initialised

```bash
pnpm --filter shell exec msw init public/ --save
pnpm --filter mfe-auth exec msw init public/ --save
pnpm --filter mfe-reports exec msw init public/ --save
pnpm --filter mfe-canva exec msw init public/ --save
```

### 2. Start all dev servers

```bash
pnpm dev
```

Wait until all five webpack-dev-servers are ready:

- shell: http://localhost:3000
- mfe-auth: http://localhost:3001
- mfe-projects: http://localhost:3002
- mfe-reports: http://localhost:3003
- mfe-canva: http://localhost:3004

---

## Integration Scenarios

### Scenario 1 — Shell loads all MFE remotes

**Setup**: All dev servers running  
**Steps**:

1. Open http://localhost:3000 in browser
2. Open DevTools → Network tab — confirm `remoteEntry.js` files load from ports 3001–3004
3. Navigate to `/projects` — confirm `mfe-projects` renders without error boundary

**Expected**: No `Loading chunk failed` or CORS errors in console

---

### Scenario 2 — Create Project → Report rendered inline

**Steps**:

1. Log in at http://localhost:3000/auth/login (MSW returns mock user)
2. Navigate to `/projects/new`
3. Fill in: Brand name = "Test Brand", Brand values = "Bold", add handle `test_brand`
4. Submit form
5. Observe redirect to `/projects/:id`
6. Confirm "Audience Analysis Report" section shows metric cards (not spinner or error)

**Expected**:

- MSW intercepts `POST /reports` → returns `{ report_id, status: "done", report: { metrics: [...] } }`
- `ProjectsApiService.createProject` maps response to local `Project` with `status: "REPORT_READY"` and `reportData`
- `ReportPanel` receives `preloadedReport` → renders metric grid without additional fetch
- No PROCESSING spinner displayed (sync API)

---

### Scenario 3 — Report Panel standalone (mfe-reports port 3003)

**Steps**:

1. Open http://localhost:3003 directly
2. Confirm metric cards render

**Expected**: MSW handler at `mfe-reports` intercepts `GET /projects/dev-project/report` and returns mock metrics

---

### Scenario 4 — Canva Panel generates presentation

**Steps**:

1. On project detail page (Scenario 2), scroll to "Canva Presentation" section
2. Click "Generate presentation"
3. Confirm loading state appears briefly, then Canva link appears

**Expected**: MSW intercepts `POST /canva/setup` then `POST /canva/generate`; link displayed

---

### Scenario 5 — Canva Panel standalone (mfe-canva port 3004)

**Steps**:

1. Open http://localhost:3004
2. Click "Generate presentation"

**Expected**: Mock session token obtained, mock Canva link displayed

---

### Scenario 6 — Delete project

**Steps**:

1. On project list, open a project
2. Click delete icon → confirm dialog
3. Confirm redirect to `/projects` list

**Expected**: MSW `DELETE /projects/:id` returns 204; project removed from local store; list empty

---

## Cleanup

Stop all dev servers with `Ctrl+C` in the terminal running `pnpm dev`.

---

## Notes

- All integration tests are manual browser-based with MSW for this MVP; automated Playwright/Cypress E2E is out of scope
- The real backend at `http://localhost:3000/reports` can be substituted by stopping MSW (`worker.stop()` in browser console) and pointing `REACT_APP_API_URL` to the real backend
