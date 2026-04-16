# Component Definitions

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07  
**Architecture**: Micro-Frontend SPA — Webpack Module Federation

---

## Module Overview

```
ui/
  shell/               # Host app — orchestrates all MFEs
  mfe-auth/            # Auth micro-frontend
  mfe-projects/        # Projects micro-frontend
  mfe-reports/         # Reports micro-frontend
  mfe-canva/           # Canva presentation micro-frontend
  packages/
    @app/auth          # Shared auth library (token, guards, context)
    @app/api-client    # Shared typed API client
    @app/ui            # Shared shadcn/ui + Tailwind component library
```

---

## Shell Application (`shell`)

### ShellApp

**Type**: React Application (Webpack Module Federation Host)  
**Responsibility**: Orchestrates all micro-frontend modules; owns top-level routing, global layout, global error boundary, and auth guard enforcement.

**Sub-components**:

| Component             | Responsibility                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AppRouter`           | Defines top-level routes (`/auth/*`, `/projects/*`, `/reports/*`, `/canva/*`); lazy-loads MFE modules via dynamic import |
| `GlobalLayout`        | Persistent shell chrome: navigation sidebar/header, user menu, logout button                                             |
| `AuthGuard`           | Route wrapper — redirects unauthenticated users to `/auth/login`; reads auth state from `@app/auth`                      |
| `GlobalErrorBoundary` | Top-level React error boundary; catches any unhandled errors from any module; renders a safe fallback UI                 |
| `ModuleLoader`        | Handles Webpack Module Federation remote loading with Suspense + fallback spinner                                        |

---

## Auth Micro-Frontend (`mfe-auth`)

### AuthModule

**Type**: Webpack Module Federation Remote  
**Responsibility**: Owns all authentication UI flows. Consumes `@app/auth` for token management; does not store auth state itself.

**Sub-components**:

| Component            | Responsibility                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `LoginPage`          | Email/password login form; calls `AuthService.login()`; handles brute-force error display |
| `RegisterPage`       | Registration form (email + password); calls `AuthService.register()`                      |
| `ForgotPasswordPage` | Email entry for password reset request; calls `AuthService.requestPasswordReset()`        |
| `ResetPasswordPage`  | New password form (accessed via reset link token); calls `AuthService.resetPassword()`    |
| `AuthErrorBoundary`  | Module-level error boundary wrapping all auth pages                                       |

---

## Projects Micro-Frontend (`mfe-projects`)

### ProjectsModule

**Type**: Webpack Module Federation Remote  
**Responsibility**: Full CRUD for user projects. Manages project data and status display. Does not trigger report fetch or Canva generation (those are handled by their own modules).

**Sub-components**:

| Component               | Responsibility                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ProjectDashboard`      | Lists all user projects as cards with name and status badge; empty state for new users                         |
| `ProjectCard`           | Individual project summary card; shows name, status badge, and navigation link                                 |
| `ProjectStatusBadge`    | Visual status indicator (DRAFT / PROCESSING / REPORT_READY / PRESENTATION_READY)                               |
| `CreateProjectPage`     | Full-page form for creating a new project                                                                      |
| `EditProjectPage`       | Full-page form for editing an existing project                                                                 |
| `ProjectDetailPage`     | Composite view: project info + report slot + Canva slot (slots rendered by Reports and Canva modules)          |
| `ProjectForm`           | Reusable form with Formik + Yup: fields for name, brand values, brand design guidelines, social media profiles |
| `SocialProfileList`     | Dynamic list input for adding/removing social media profile URLs                                               |
| `DeleteProjectDialog`   | Confirmation modal for project deletion                                                                        |
| `ProjectsErrorBoundary` | Module-level error boundary                                                                                    |

---

## Reports Micro-Frontend (`mfe-reports`)

### ReportsModule

**Type**: Webpack Module Federation Remote  
**Responsibility**: Displays audience analysis report for a given project. Subscribes to SSE project status stream; shows processing state, report cards, or error state.

**Sub-components**:

| Component              | Responsibility                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `ReportPanel`          | Top-level container; receives `projectId` prop; orchestrates SSE subscription and report display |
| `ProcessingState`      | Loading UI shown when project status is PROCESSING; includes animated indicator                  |
| `ReportCardGrid`       | Grid layout of `ReportSummaryCard` components                                                    |
| `ReportSummaryCard`    | Individual metric card: label, value, optional icon/trend indicator                              |
| `ReportErrorState`     | Error display with retry action when external API fails                                          |
| `ReportsErrorBoundary` | Module-level error boundary                                                                      |

---

## Canva Micro-Frontend (`mfe-canva`)

### CanvaModule

**Type**: Webpack Module Federation Remote  
**Responsibility**: Manages the Canva presentation generation flow. Renders the Generate button, progress state, link display, and error handling.

**Sub-components**:

| Component            | Responsibility                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `CanvaPanel`         | Top-level container; receives `projectId` and `reportReady` props; orchestrates the generation flow |
| `GenerateButton`     | "Generate Presentation" button; disabled/hidden when report not ready                               |
| `GenerationProgress` | Progress indicator shown during the two-step API flow                                               |
| `CanvaLinkDisplay`   | Shows the generated Canva design link; opens in new tab                                             |
| `CanvaErrorState`    | Error display with retry action for failed generation steps                                         |
| `CanvaErrorBoundary` | Module-level error boundary                                                                         |

---

## Shared Packages

### `@app/auth`

**Type**: Shared Library  
**Responsibility**: Token storage, session validation, auth context provider, auth guards. Used by Shell (guards) and Auth MFE (service calls).

| Component / Export | Responsibility                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `AuthProvider`     | React context provider; holds auth state (user, token, isAuthenticated)                    |
| `useAuth`          | Hook for consuming auth context                                                            |
| `AuthService`      | Service class: login, register, logout, requestPasswordReset, resetPassword, validateToken |
| `tokenStorage`     | Abstraction over secure cookie / httpOnly session storage (not localStorage)               |
| `withAuthGuard`    | HOC / route guard — redirects to login if unauthenticated                                  |

### `@app/api-client`

**Type**: Shared Library  
**Responsibility**: Typed HTTP client for all external API calls. Used by mfe-reports and mfe-canva via React Query hooks.

| Export               | Responsibility                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `apiClient`          | Configured axios/fetch instance with base URL, auth token injection, error interceptor        |
| `ProjectsApiService` | Typed methods: `createProject`, `getProjects`, `getProject`, `updateProject`, `deleteProject` |
| `ReportsApiService`  | Typed methods: `triggerReport`, `getReportStatus`, `getReportData`                            |
| `CanvaApiService`    | Typed methods: `canvaSetup` (endpoint 1), `canvaGenerate` (endpoint 2)                        |
| `sseClient`          | SSE connection factory for project status streaming                                           |

### `@app/ui`

**Type**: Shared Library  
**Responsibility**: Shared UI component library built on shadcn/ui + Tailwind CSS. Implements the **Chinoiserie** visual design system — a refined aesthetic inspired by East Asian decorative art: botanical motifs, jade greens, porcelain blues, gold accents, and ivory backgrounds. All modules consume this library exclusively to ensure visual consistency (NFR-UX-06).

**Chinoiserie Design Tokens** (encoded in `tailwind.config`):

| Token Category           | Values                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| **Primary palette**      | `jade` (#2D6A4F deep green), `porcelain` (#4A7FA5 blue), `gold` (#C9A84C), `ivory` (#F5F0E8) |
| **Surface colors**       | `surface-light` (#FAF6EE), `surface-dark` (#1C2B22)                                          |
| **Typography — display** | Serif or semi-serif (e.g., `Cormorant Garamond`, `IM Fell English`)                          |
| **Typography — body**    | Clean sans-serif (e.g., `Inter`, `DM Sans`)                                                  |
| **Border radius**        | Subtly rounded; card borders feature fine decorative line motifs via CSS                     |
| **Shadow**               | Soft, warm shadows using `gold`-tinted rgba values                                           |

| Export              | Responsibility                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `Button`            | Primary (jade), secondary (ivory/gold border), destructive variants; Chinoiserie-styled hover states |
| `Input`             | Text input with error state; porcelain-blue focus ring; ivory background                             |
| `Card`              | Container card with decorative border accent; header/body/footer slots                               |
| `Badge`             | Status badge with Chinoiserie color variants (jade=success, porcelain=processing, gold=info)         |
| `Dialog`            | Modal dialog with ornate header border treatment                                                     |
| `Spinner`           | Loading spinner using gold/jade palette                                                              |
| `ErrorMessage`      | Standardised error display component                                                                 |
| `EmptyState`        | Empty list / no-data state with botanical illustration slot and CTA                                  |
| `DecorativeDivider` | Ornamental horizontal rule with Chinoiserie motif (used between sections)                            |
| `tailwind.config`   | Shared Tailwind configuration — Chinoiserie design tokens, colors, typography, spacing               |
