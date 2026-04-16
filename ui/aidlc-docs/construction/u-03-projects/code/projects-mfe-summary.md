# Code Summary — U-03: mfe-projects

**Unit**: U-03 mfe-projects  
**Port**: 3002  
**MF exposes**: `./Module`  
**Status**: COMPLETED (updated 2026-04-09)

---

## Files

| File | Purpose |
|---|---|
| `apps/mfe-projects/src/Module.tsx` | MFE entry — React Router routes for `/projects/*` |
| `apps/mfe-projects/src/pages/ProjectDashboard.tsx` | Project list with cards and create button |
| `apps/mfe-projects/src/pages/CreateProjectPage.tsx` | Form page — calls `POST /api/projects` via `ProjectsApiService.createProject` |
| `apps/mfe-projects/src/pages/ProjectDetailPage.tsx` | Detail view with "Start analysis" button, ReportPanel + CanvaPanel MFE slots |
| `apps/mfe-projects/src/pages/EditProjectPage.tsx` | Read-only stub |
| `apps/mfe-projects/src/components/ProjectForm.tsx` | Formik + Yup form: `name`, `brand_input` (no handles) |
| `apps/mfe-projects/src/components/ProjectStatusBadge.tsx` | Status chip |
| `apps/mfe-projects/src/components/DeleteProjectDialog.tsx` | Confirmation modal |
| `apps/mfe-projects/src/components/StartAnalysisDialog.tsx` | Image upload dialog — sends `POST /api/reports` multipart |
| `apps/mfe-projects/src/hooks/useProjects.ts` | React Query hooks: `useProjects`, `useProject`, `useCreateProject`, `useDeleteProject`, `useStartAnalysis` |
| `apps/mfe-projects/src/webpack.config.js` | MF remote config |

## Key Design Decisions

- **Two-step flow**: Project creation (`POST /api/projects`) is separate from analysis (`POST /api/reports`). Projects are created in `DRAFT` status; analysis is triggered explicitly by the user.
- **No Instagram handles**: Handles have been removed from the project creation form and from the `Project` / `ProjectInput` types. The new API contract does not require them.
- **Image upload**: `StartAnalysisDialog` collects up to 50 image files (20 MB each) and posts them as `multipart/form-data` to `POST /api/reports`. The `handles` param is omitted.
- **Async analysis**: `POST /api/reports` returns `{ report_id }` only — no inline report data. Report results are handled by the next user story (polling).
- **ReportPanel**: Receives no `preloadedReport`; will display its empty/loading state until the polling story is implemented.
- **Local MSW store**: `POST /api/projects` creates a project in `DRAFT` status in the in-memory store. `POST /api/reports` returns a mock `report_id` with `202 Accepted`.

## API Contracts

```
POST /api/projects
Authorization: Bearer ramsey-packado
{ brand: string; brand_input: string }
→ 201 { id, brand, brand_input, status: "DRAFT", createdAt, updatedAt }

POST /api/reports
Authorization: Bearer ramsey-packado
Content-Type: multipart/form-data
files: File[]   (up to 50 files, 20 MB each; no handles param)
→ 202 { report_id: string }

GET  /api/projects         → Project[]
GET  /api/projects/:id     → Project
DELETE /api/projects/:id   → 204
```
