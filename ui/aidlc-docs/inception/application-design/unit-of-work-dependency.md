# Unit of Work Dependency Matrix

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07

---

## Dependency Matrix

| Unit                      | Depends On  | Type            | Reason                                                                                                                                          |
| ------------------------- | ----------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| U-01 Shell & Shared Infra | —           | —               | Foundation unit; no dependencies on other units                                                                                                 |
| U-02 mfe-auth             | U-01        | Hard dependency | Consumes `@app/auth` (AuthService, useAuth) and `@app/ui` (form components)                                                                     |
| U-03 mfe-projects         | U-01        | Hard dependency | Consumes `@app/api-client` (ProjectsApiService), `@app/auth` (useAuth), `@app/ui`                                                               |
| U-04 mfe-reports          | U-01        | Hard dependency | Consumes `@app/api-client` (ReportsApiService, sseClient), `@app/ui`                                                                            |
| U-05 mfe-canva            | U-01        | Hard dependency | Consumes `@app/api-client` (CanvaApiService), `@app/ui`                                                                                         |
| U-03 mfe-projects         | U-04 + U-05 | Soft / runtime  | `ProjectDetailPage` renders ReportPanel and CanvaPanel as MFE slots (Module Federation dynamic import at runtime — not a build-time dependency) |

---

## Dependency Diagram

```
                    +----------------------------------+
                    |  U-01: Shell & Shared Infra      |
                    |  shell + @app/auth               |
                    |  @app/api-client + @app/ui       |
                    +----------------------------------+
                           |          |       |       |
                    build  |          |       |       |  build
                    dep    v          v       v       v  dep
              +----------+ +----------+ +----------+ +----------+
              | U-02     | | U-03     | | U-04     | | U-05     |
              | mfe-auth | |mfe-proj  | |mfe-rep   | |mfe-canva |
              +----------+ +----------+ +----------+ +----------+
                                |              ^          ^
                                |  runtime MFE |          |
                                +-- dynamic ---+----------+
                                    import (not build dep)
```

---

## Inter-Unit Communication Contracts

### U-03 → U-04 (ReportPanel slot)

`ProjectDetailPage` (U-03) dynamically imports `ReportPanel` from `mfe-reports` (U-04) and passes:

```typescript
// Props contract between U-03 and U-04
interface ReportPanelProps {
  projectId: string;
  initialStatus: ProjectStatus;
}
```

### U-03 → U-05 (CanvaPanel slot)

`ProjectDetailPage` (U-03) dynamically imports `CanvaPanel` from `mfe-canva` (U-05) and passes:

```typescript
// Props contract between U-03 and U-05
interface CanvaPanelProps {
  projectId: string;
  reportReady: boolean;
  existingCanvaLink?: string;
}
```

---

## Critical Path

```
U-01 (Shell & Shared Infra)
    → U-02 (mfe-auth)       [can start after U-01]
    → U-03 (mfe-projects)   [can start after U-01; runtime dep on U-04, U-05]
    → U-04 (mfe-reports)    [can start after U-01]
    → U-05 (mfe-canva)      [can start after U-01]
```

U-01 is the **sole blocking dependency**. U-02 through U-05 can all be developed in parallel once U-01 is complete.

---

## Shared Singleton Enforcement (Module Federation)

All units declare the following as shared singletons to prevent duplicate instances:

| Package            | Singleton | Version Strategy         |
| ------------------ | --------- | ------------------------ |
| `react`            | Yes       | `requiredVersion: "^18"` |
| `react-dom`        | Yes       | `requiredVersion: "^18"` |
| `react-router-dom` | Yes       | Exact version            |
| `@app/auth`        | Yes       | Exact workspace version  |
| `@app/api-client`  | Yes       | Exact workspace version  |
| `@app/ui`          | Yes       | Exact workspace version  |

---

## External Dependencies (Outside This Repo)

| Dependency                | Used By                              | Contract Status                                                |
| ------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Audience Analysis API     | U-04 (ReportsApiService)             | TBD — endpoint URL + auth via env var                          |
| Canva Step-1 API endpoint | U-05 (CanvaApiService.canvaSetup)    | TBD — contract to be confirmed with backend team               |
| Canva Step-2 API endpoint | U-05 (CanvaApiService.canvaGenerate) | TBD — contract to be confirmed with backend team               |
| SSE status stream         | U-04 (sseClient)                     | TBD — requires backend to expose `/projects/:id/status-stream` |
