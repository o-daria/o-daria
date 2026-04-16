# Unit of Work — Story Map
# Marketing Audience Analysis Platform (o_daria_ui)

**Version**: 1.0  
**Date**: 2026-04-07

---

## Story-to-Unit Assignment

| Story ID | Story Title | Unit | Primary Components |
|---|---|---|---|
| US-AUTH-01 | Register with Email and Password | U-02 mfe-auth | `RegisterPage`, `ProjectForm` (Formik+Yup), `AuthService.register()` |
| US-AUTH-02 | Log In with Email and Password | U-02 mfe-auth + U-01 Shell | `LoginPage` (U-02), `AuthGuard` (U-01), `AuthService.login()` (U-01 @app/auth) |
| US-AUTH-03 | Log Out | U-01 Shell + U-02 mfe-auth | `GlobalLayout` logout button (U-01), `AuthService.logout()` (U-01 @app/auth) |
| US-AUTH-04 | Reset Password | U-02 mfe-auth | `ForgotPasswordPage`, `ResetPasswordPage`, `AuthService.requestPasswordReset/resetPassword()` |
| US-PROJ-01 | Create a New Project | U-03 mfe-projects | `CreateProjectPage`, `ProjectForm`, `SocialProfileList`, `ProjectsApiService.createProject()` |
| US-PROJ-02 | View Project List | U-03 mfe-projects | `ProjectDashboard`, `ProjectCard`, `ProjectStatusBadge`, `ProjectsApiService.getProjects()` |
| US-PROJ-03 | View Project Details | U-03 mfe-projects | `ProjectDetailPage`, `ProjectsApiService.getProject()` |
| US-PROJ-04 | Edit Project Information | U-03 mfe-projects | `EditProjectPage`, `ProjectForm`, `ProjectsApiService.updateProject()` |
| US-PROJ-05 | Delete a Project | U-03 mfe-projects | `DeleteProjectDialog`, `ProjectsApiService.deleteProject()` |
| US-REPORT-01 | View Audience Analysis Report | U-04 mfe-reports | `ReportPanel`, `ProcessingState`, `ReportCardGrid`, `ReportSummaryCard`, `useProjectStatusSSE`, `useReportData` |
| US-CANVA-01 | Generate a Canva Presentation | U-05 mfe-canva | `CanvaPanel`, `GenerateButton`, `GenerationProgress`, `CanvaLinkDisplay`, `useCanvaGeneration` |

**Total stories**: 11 — all assigned ✓

---

## Unit Coverage Summary

| Unit | Stories | Story IDs |
|---|---|---|
| U-01 Shell & Shared Infra | 2 (partial) | US-AUTH-02 (AuthGuard), US-AUTH-03 (logout button) |
| U-02 mfe-auth | 4 | US-AUTH-01, US-AUTH-02, US-AUTH-03, US-AUTH-04 |
| U-03 mfe-projects | 5 | US-PROJ-01, US-PROJ-02, US-PROJ-03, US-PROJ-04, US-PROJ-05 |
| U-04 mfe-reports | 1 | US-REPORT-01 |
| U-05 mfe-canva | 1 | US-CANVA-01 |

---

## Persona Coverage per Unit

| Unit | Personas Served |
|---|---|
| U-01 Shell | All (AuthGuard, layout wraps every page) |
| U-02 mfe-auth | New User (Jamie — primary), Marketing Analyst (Alex), Agency Manager (Sarah — login/logout) |
| U-03 mfe-projects | Marketing Analyst (Alex — primary), Agency Manager (Sarah — view), New User (Jamie — first project) |
| U-04 mfe-reports | All (report visible to all authenticated users with a REPORT_READY project) |
| U-05 mfe-canva | Marketing Analyst (Alex — primary), Agency Manager (Sarah — verifies link), New User (Jamie — first generation) |

---

## Epic-to-Unit Mapping

| Epic | Unit |
|---|---|
| EPIC-01 Authentication | U-02 mfe-auth (forms) + U-01 Shell (guards, session) |
| EPIC-02 Project Management | U-03 mfe-projects |
| EPIC-03 Audience Analysis Reports | U-04 mfe-reports |
| EPIC-04 Canva Presentation Generation | U-05 mfe-canva |

---

## Acceptance Criteria Coverage Notes

| Story | Key AC Scenarios | Unit Responsible |
|---|---|---|
| US-AUTH-02 | "Accessing protected route without session → redirect to login" | U-01 (AuthGuard) |
| US-AUTH-02 | "Brute force protection after 5 failures" | U-02 (LoginPage) + backend |
| US-PROJ-03 | "Attempt to view another user's project by URL → 403/404" | U-03 (ProjectDetailPage) + backend IDOR check |
| US-PROJ-04 | "Attempt to edit another user's project via API → 403" | U-03 (EditProjectPage) + backend |
| US-PROJ-05 | "Attempt to delete another user's project via API → 403" | U-03 (DeleteProjectDialog) + backend |
| US-REPORT-01 | "External API returns error → error state with retry" | U-04 (ReportErrorState) |
| US-CANVA-01 | "Generate button disabled when status < REPORT_READY" | U-05 (GenerateButton) |
| US-CANVA-01 | "Step 1 fails → Step 2 not called → generic error + retry" | U-05 (useCanvaGeneration) |
