# Application Design — Consolidated

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07  
**Status**: Awaiting Approval

---

## 1. Architecture Overview

The application is a **React + TypeScript SPA** using **Webpack Module Federation** for micro-frontend decomposition. There is no custom backend — the UI calls an external backend API for all data operations.

### Technology Decisions

| Concern            | Decision                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Frontend framework | React 18 + TypeScript (strict mode)                                                                     |
| Micro-frontend     | Webpack Module Federation                                                                               |
| Routing            | React Router v6: Shell owns top-level routes; MFEs own sub-routes                                       |
| Auth state sharing | `@app/auth` singleton shared library via Module Federation                                              |
| UI components      | shadcn/ui (Radix UI primitives) + Tailwind CSS                                                          |
| API communication  | `@app/api-client` typed service classes + React Query (TanStack Query v5)                               |
| Real-time status   | Server-Sent Events (SSE) for project status updates                                                     |
| Form validation    | Formik + Yup                                                                                            |
| Styling            | Tailwind CSS with **Chinoiserie** design system (jade, porcelain, gold, ivory palette)                  |
| Error boundaries   | Per-module + global Shell fallback                                                                      |
| Visual aesthetic   | **Chinoiserie** — East Asian decorative art style; botanical motifs, ornate borders, refined typography |

---

## 2. Module Structure

```
ui/
  shell/                        # Host application (Module Federation host)
  mfe-auth/                     # Auth micro-frontend (remote)
  mfe-projects/                 # Projects micro-frontend (remote)
  mfe-reports/                  # Reports micro-frontend (remote)
  mfe-canva/                    # Canva micro-frontend (remote)
  packages/
    @app/auth/                  # Shared auth library
    @app/api-client/            # Shared typed HTTP client
    @app/ui/                    # Shared UI component library (shadcn/ui + Tailwind)
```

---

## 3. Component Summary

### Shell

- `AppRouter` — top-level routes, lazy MFE loading with Suspense
- `GlobalLayout` — persistent navigation, user menu
- `AuthGuard` — route-level auth enforcement
- `GlobalErrorBoundary` — top-level catch-all error boundary
- `ModuleLoader` — Webpack Module Federation remote loading wrapper

### mfe-auth

- `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`
- `AuthErrorBoundary`

### mfe-projects

- `ProjectDashboard`, `ProjectCard`, `ProjectStatusBadge`
- `CreateProjectPage`, `EditProjectPage`, `ProjectDetailPage`
- `ProjectForm`, `SocialProfileList`, `DeleteProjectDialog`
- `ProjectsErrorBoundary`

### mfe-reports

- `ReportPanel`, `ProcessingState`, `ReportCardGrid`, `ReportSummaryCard`
- `ReportErrorState`, `ReportsErrorBoundary`

### mfe-canva

- `CanvaPanel`, `GenerateButton`, `GenerationProgress`
- `CanvaLinkDisplay`, `CanvaErrorState`, `CanvaErrorBoundary`

### @app/auth

- `AuthProvider`, `useAuth`, `AuthService`, `tokenStorage`, `withAuthGuard`

### @app/api-client

- `apiClient`, `ProjectsApiService`, `ReportsApiService`, `CanvaApiService`, `sseClient`

### @app/ui

- `Button`, `Input`, `Card`, `Badge`, `Dialog`, `Spinner`, `ErrorMessage`, `EmptyState`
- Shared `tailwind.config`

---

## 4. Key Data Models

```typescript
type ProjectStatus =
  | "DRAFT"
  | "PROCESSING"
  | "REPORT_READY"
  | "PRESENTATION_READY";

interface Project {
  id: string;
  name: string;
  brandValues: string;
  brandDesignGuidelines: string;
  audienceSocialMediaProfiles: string[];
  status: ProjectStatus;
  ownerId: string;
  canvaLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportData {
  projectId: string;
  generatedAt: string;
  metrics: Array<{ label: string; value: string | number; unit?: string }>;
}

interface User {
  id: string;
  email: string;
  createdAt: string;
}
```

---

## 5. Core User Flows

### Authentication

```
/auth/login         → LoginPage       → AuthService.login()       → redirect /projects
/auth/register      → RegisterPage    → AuthService.register()    → redirect /projects
/auth/forgot        → ForgotPasswordPage → AuthService.requestPasswordReset()
/auth/reset/:token  → ResetPasswordPage → AuthService.resetPassword()
```

### Project Lifecycle

```
/projects           → ProjectDashboard  (list all projects)
/projects/new       → CreateProjectPage → POST /projects → status: DRAFT
/projects/:id       → ProjectDetailPage
  ├── ProjectForm   (view/edit)
  ├── ReportPanel   (status SSE + report cards)  ← mfe-reports
  └── CanvaPanel    (generate button + link)      ← mfe-canva
/projects/:id/edit  → EditProjectPage  → PATCH /projects/:id
```

### Automated Report Flow

```
Project created (DRAFT)
  → Backend transitions to PROCESSING + calls external analysis API
  → SSE stream: backend sends REPORT_READY event
  → ReportPanel fetches report data
  → Summary cards rendered
```

### Canva Generation Flow

```
User clicks "Generate Presentation" (REPORT_READY status required)
  → canvaSetup() [Step 1]
  → canvaGenerate() [Step 2]
  → CanvaLinkDisplay shows link
  → User opens Canva in new tab
```

---

## 6. Security Design Summary (SECURITY-11)

Security-critical logic is isolated in dedicated modules per SECURITY-11:

| Concern                 | Isolation                                                                |
| ----------------------- | ------------------------------------------------------------------------ |
| Auth/session management | `@app/auth` library only                                                 |
| Token storage           | `tokenStorage` abstraction in `@app/auth` — no direct localStorage       |
| Route guards            | `AuthGuard` in Shell, reads from `@app/auth`                             |
| Input validation        | Formik + Yup schemas per form; all inputs validated before API calls     |
| API error handling      | Global interceptor in `apiClient`; 401 → logout flow                     |
| Error display           | `ErrorMessage` component always shows generic messages (no stack traces) |
| Error boundaries        | Per-module + global Shell boundary (SECURITY-15)                         |

---

## 7. Chinoiserie Design System Summary (NFR-UX-01 — NFR-UX-06)

The entire application adopts a **Chinoiserie** visual aesthetic — inspired by East Asian decorative art tradition:

| Attribute                 | Specification                                                                   |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Color palette**         | Jade green (#2D6A4F), Porcelain blue (#4A7FA5), Gold (#C9A84C), Ivory (#F5F0E8) |
| **Display typography**    | Serif display font (e.g., Cormorant Garamond) for headings and labels           |
| **Body typography**       | Clean sans-serif (e.g., Inter / DM Sans) for body text and form fields          |
| **Component styling**     | Subtle decorative borders, fine botanical line motifs, warm shadow treatment    |
| **Icons & illustrations** | Chinoiserie-style botanical/floral motifs; no generic material/flat icons       |
| **Consistency**           | Enforced via `@app/ui` shared library across all micro-frontend modules         |

**Implementation note**: The Tailwind config in `@app/ui` encodes all design tokens. MFE modules extend this config and must not override palette or typography tokens.

## 8. Reference Documents

- [components.md](components.md) — Full component definitions and responsibilities
- [component-methods.md](component-methods.md) — Method signatures and TypeScript interfaces
- [services.md](services.md) — Service layer design and React Query integration
- [component-dependency.md](component-dependency.md) — Dependency matrix, Module Federation config, data flow diagrams
