# U-03 Change: Project Creation Without Handles + Image Upload Analysis

**Type**: Brownfield modification  
**Unit**: U-03 mfe-projects  
**Date**: 2026-04-09  

---

## Summary of Change

| # | What changes | Why |
|---|---|---|
| 1 | `POST /api/projects` replaces `POST /api/reports` for project creation | New backend contract: project creation is a separate step |
| 2 | Instagram handles removed from project creation form | User can create a project without providing handles |
| 3 | `POST /api/reports` is called separately with `multipart/form-data` files | Analysis is triggered on demand after project creation |
| 4 | New "Start analysis" button on ProjectDetailPage | Explicit user action to start analysis |
| 5 | Image upload popup (50 files max, 20 MB each) | Files are sent as multipart form data |

---

## Impacted Files

| File | Change type | Description |
|---|---|---|
| `packages/@app/api-client/src/types.ts` | Modify | Add `CreateProjectRequest`, `CreateProjectResponse`; update `ProjectInput`; add `StartAnalysisRequest` (multipart) |
| `packages/@app/api-client/src/services/ProjectsApiService.ts` | Modify | Add `createProject` → `POST /api/projects`; add `startAnalysis` → `POST /api/reports` multipart |
| `packages/@app/api-client/src/index.ts` | Modify | Export new types |
| `apps/mfe-projects/src/components/ProjectForm.tsx` | Modify | Remove handles field and validation; form now has `name` + `brand_input` only |
| `apps/mfe-projects/src/pages/CreateProjectPage.tsx` | Modify | Use updated `ProjectInput`; navigate to `/projects/:id` on success |
| `apps/mfe-projects/src/pages/ProjectDetailPage.tsx` | Modify | Add "Start analysis" button; remove handles list display (no handles on project anymore) |
| `apps/mfe-projects/src/components/StartAnalysisDialog.tsx` | Create | New dialog: file upload (50 files, 20 MB each); calls `startAnalysis` on submit |
| `apps/mfe-projects/src/hooks/useProjects.ts` | Modify | Add `useStartAnalysis` mutation hook |

---

## Step-by-Step Plan

### Step 1 — Update types in `packages/@app/api-client/src/types.ts`
- [x] Remove `handles` from `ProjectInput`
- [x] Add `CreateProjectRequest { brand_input: string; brand: string; }`
- [x] Add `CreateProjectResponse { id: string; brand: string; brand_input: string; status: ProjectStatus; createdAt: string; updatedAt: string; }`
- [x] Remove `handles` from `Project` interface (field no longer returned by backend)
- [x] Remove `ReportRequest` / `ReportResponse` (replaced by multipart flow)
- [x] Add `StartAnalysisResponse { report_id: string; }` (async — no inline report)

### Step 2 — Update `ProjectsApiService` in `packages/@app/api-client/src/services/ProjectsApiService.ts`
- [x] Replace `createProject` body: send `{ brand_input, brand }` to `POST /api/projects`; map response to `Project`
- [x] Add `startAnalysis(projectId: string, files: File[]): Promise<StartAnalysisResponse>`:
  - Build `FormData` with `files` array (key = `files`)
  - `POST /api/reports` with `Content-Type: multipart/form-data`
  - Return `{ report_id }`
- [x] Remove old `mapResponseToProject` helper (no longer needed in same form)
- [x] Keep `getProjects`, `getProject`, `deleteProject` unchanged

### Step 3 — Export new types from `packages/@app/api-client/src/index.ts`
- [x] Add `CreateProjectRequest`, `CreateProjectResponse`, `StartAnalysisResponse` to exports
- [x] Remove `ReportRequest`, `ReportResponse` exports (no longer public API)

### Step 4 — Update `ProjectForm` in `apps/mfe-projects/src/components/ProjectForm.tsx`
- [x] Remove `handles` field, `FieldArray`, and related Yup validation
- [x] Update `ProjectInput` type usage (handles gone)
- [x] Keep `name` (brand name) and `brand_input` (brand values) fields
- [x] Keep `data-testid` attributes

### Step 5 — Update `CreateProjectPage` in `apps/mfe-projects/src/pages/CreateProjectPage.tsx`
- [x] No structural change needed (still calls `useCreateProject`, navigates to `/projects/:id`)
- [x] Verify `ProjectInput` import aligns with updated type

### Step 6 — Update `ProjectDetailPage` in `apps/mfe-projects/src/pages/ProjectDetailPage.tsx`
- [x] Remove the Instagram handles `<dl>` block (no handles on project)
- [x] Add "Start analysis" button (shown when `project.status === "DRAFT"`)
- [x] Wire button to open `StartAnalysisDialog`
- [x] Pass `projectId` and `onSuccess` callback to dialog
- [x] On success: invalidate project query so status refreshes
- [x] Keep delete, ReportPanel, CanvaPanel slots unchanged

### Step 7 — Create `StartAnalysisDialog` in `apps/mfe-projects/src/components/StartAnalysisDialog.tsx`
- [x] Use `Dialog` from `@app/ui`
- [x] File input: `multiple`, `accept="image/*"`, up to 50 files, max 20 MB per file
- [x] Client-side validation: count ≤ 50, each file ≤ 20 MB — show inline error if violated
- [x] "Submit" button calls `useStartAnalysis` mutation
- [x] Loading state on submit button
- [x] On success: call `onSuccess()` and close dialog
- [x] On error: show error message inside dialog
- [x] `data-testid` attributes: `start-analysis-dialog`, `file-upload-input`, `start-analysis-submit-button`

### Step 8 — Add `useStartAnalysis` hook in `apps/mfe-projects/src/hooks/useProjects.ts`
- [x] Add `useStartAnalysis(projectId: string)` mutation
- [x] `mutationFn`: calls `ProjectsApiService.startAnalysis(projectId, files)`
- [x] `onSuccess`: invalidate `KEYS.detail(projectId)` so detail page refreshes

### Step 9 — Update MSW handlers (if present) for local dev
- [x] Check for existing MSW handler files in `apps/mfe-projects/src/`
- [x] Add handler for `POST /api/projects` returning a mock project (no handles)
- [x] Add handler for `POST /api/reports` (multipart) returning `{ report_id: "mock-report-1" }`
- [x] Ensure old `POST /reports` with JSON body still works or is replaced

### Step 10 — Update documentation
- [x] Update `aidlc-docs/construction/u-03-projects/code/projects-mfe-summary.md` to reflect new API contract and new components

---

## Constraints & Notes

- **No handles on project**: `Project.handles` field is removed from the type; `ProjectDetailPage` must not render it
- **Async analysis**: `POST /api/reports` no longer returns inline report data — that is deferred to the next user story (polling)
- **`ProjectDetailPage` report slot**: `ReportPanel` currently receives `preloadedReport`. After this change, there will be no preloaded data at creation time. The panel should still render (it will show empty/loading state). This is acceptable — the next user story handles polling.
- **No `updateProject` call** — `useUpdateProject` hook is untouched
- **Security**: file upload validates count and size client-side; server-side validation is the API's responsibility
- **Auth token**: keep `Authorization: Bearer ramsey-packado` on `POST /api/reports`
