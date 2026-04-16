# Code Generation Plan — U-03 + U-04 + U-05: Projects, Reports, Canva

# Marketing Audience Analysis Platform (ui)

**Phase**: CONSTRUCTION — Code Generation  
**Units**: U-03 mfe-projects · U-04 mfe-reports · U-05 mfe-canva  
**Status**: Part 2 — GENERATION  
**Date**: 2026-04-08

---

## Real API Contract (authoritative — overrides prior stubs)

```
POST http://localhost:3000/reports
Authorization: Bearer ramsey-packado
Content-Type: application/json

{
  "brand_input": string,           // brand values text
  "handles": string[],             // instagram usernames (no URL, no @)
  "keep_handles": boolean,
  "sync": true,
  "brand": string                  // project/brand name
}

Response 200:
{
  "report_id": string,
  "status": "done",
  "report": object                 // full report payload
}
```

**Key implications**:

- Single endpoint replaces previous `/projects` CRUD
- `sync: true` → report returned synchronously; no PROCESSING state needed
- Handles are plain Instagram usernames, not full URLs
- No separate "project" concept in backend — report IS the entity
- `Authorization: Bearer ramsey-packado` hardcoded for MVP dev token

---

## Unit Context

| Unit              | App dir              | Port | MF exposes      |
| ----------------- | -------------------- | ---- | --------------- |
| U-03 mfe-projects | `apps/mfe-projects/` | 3002 | `./Module`      |
| U-04 mfe-reports  | `apps/mfe-reports/`  | 3003 | `./ReportPanel` |
| U-05 mfe-canva    | `apps/mfe-canva/`    | 3004 | `./CanvaPanel`  |

---

## Stories Covered

| Story        | Unit | Notes                                                |
| ------------ | ---- | ---------------------------------------------------- |
| US-PROJ-01   | U-03 | Create project → calls POST /reports                 |
| US-PROJ-02   | U-03 | View project list (from local state / report list)   |
| US-PROJ-03   | U-03 | View project detail page                             |
| US-PROJ-04   | U-03 | Edit not supported by API — read-only after creation |
| US-PROJ-05   | U-03 | Delete from local list only (no backend delete)      |
| US-REPORT-01 | U-04 | Show report cards from response.report               |
| US-CANVA-01  | U-05 | Generate presentation (unchanged)                    |

---

## Step-by-Step Plan

### Step 1 — Adapt @app/api-client types for real contract

- [x] Update `packages/@app/api-client/src/types.ts`:
  - Add `ReportRequest` interface matching real API payload
  - Add `ReportResponse` interface matching real API response
  - Keep `Project` type but add `reportData` optional field for embedded report
  - Remove or alias `brandDesignGuidelines` field (not in real API)
  - Add `brand` and `handles` (string[]) as primary fields

### Step 2 — Adapt ProjectsApiService to call POST /reports

- [x] Update `packages/@app/api-client/src/services/ProjectsApiService.ts`:
  - `createProject` → calls `POST /reports` with real payload
  - Add Bearer token header (`ramsey-packado`) for MVP
  - Map response `{ report_id, status, report }` to local `Project` shape
  - Keep `getProjects`, `getProject`, `deleteProject` operating on local in-memory store (no backend)
  - Remove `updateProject` (API doesn't support edit)

### Step 3 — Adapt ProjectForm fields

- [x] Update `apps/mfe-projects/src/components/ProjectForm.tsx`:
  - Rename `brandValues` → `brand_input` label: "Brand values"
  - Rename `audienceSocialMediaProfiles` → `handles`: plain Instagram usernames (no URL validation, just string)
  - Remove `brandDesignGuidelines` field (not in API)
  - Add `brand` field (project/brand name) — same as `name`
  - Update Yup schema accordingly

### Step 4 — Adapt ProjectDetailPage to show embedded report immediately

- [x] Update `apps/mfe-projects/src/pages/ProjectDetailPage.tsx`:
  - Pass `reportData` from project to `ReportPanel` if available
  - Remove SSE/PROCESSING state (sync API → always REPORT_READY after creation)
  - Set initial status to `REPORT_READY` when project has a report

### Step 5 — Adapt ReportPanel to accept pre-loaded report

- [x] Update `apps/mfe-reports/src/ReportPanel.tsx`:
  - Add optional `preloadedReport` prop
  - Skip API fetch when `preloadedReport` provided
  - Keep existing polling/SSE fallback for future async scenarios
  - Adapt to render whatever shape `report` comes in from real API

### Step 6 — Update MSW handlers for real API shape

- [x] Update `apps/shell/src/mocks/handlers.ts`:
  - Replace `POST /projects` with `POST /reports` matching real contract
  - Response: `{ report_id, status: 'done', report: { metrics: [...] } }`
  - Keep GET handlers for project list/detail working against local store

### Step 7 — Wire mfe-projects webpack (already done in stub — verify)

- [x] Read `apps/mfe-projects/webpack.config.js` and verify MF config at port 3002

### Step 8 — Add mfe-reports MSW mock + standalone main

- [x] Update `apps/mfe-reports/src/main.tsx` to start MSW before mount (dev)
- [x] Create `apps/mfe-reports/src/mocks/handlers.ts` with report stub
- [x] Create `apps/mfe-reports/src/mocks/browser.ts`

### Step 9 — Add mfe-canva MSW mock + standalone main

- [x] Update `apps/mfe-canva/src/main.tsx` to start MSW before mount (dev)
- [x] Create `apps/mfe-canva/src/mocks/handlers.ts`
- [x] Create `apps/mfe-canva/src/mocks/browser.ts`

### Step 10 — Write code summary docs

- [x] Create `aidlc-docs/construction/u-03-projects/code/projects-mfe-summary.md`
- [x] Create `aidlc-docs/construction/u-04-reports/code/reports-mfe-summary.md`
- [x] Create `aidlc-docs/construction/u-05-canva/code/canva-mfe-summary.md`

### Step 11 — Update aidlc-state.md and audit.md

- [x] Mark U-03, U-04, U-05 Code Generation as COMPLETED
- [x] Log completion in audit.md
