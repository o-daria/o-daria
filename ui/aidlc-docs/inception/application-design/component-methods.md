# Component Method Signatures

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07  
**Note**: Detailed business rules and implementation logic are defined in Functional Design (CONSTRUCTION phase, per unit).

---

## Shell — `AuthGuard`

```typescript
// Props
interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string; // default: '/auth/login'
}

// Usage: wraps protected routes
<AuthGuard redirectTo="/auth/login">
  <ProjectsModule />
</AuthGuard>
```

---

## Shell — `AppRouter`

```typescript
// Route map (top-level)
const routes: RouteConfig[] = [
  { path: "/auth/*", component: AuthModule, public: true },
  { path: "/projects/*", component: ProjectsModule, public: false },
  { path: "/", redirect: "/projects" },
];
```

---

## `@app/auth` — `AuthService`

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
interface LoginResponse {
  accessToken: string;
  user: User;
}

interface RegisterRequest {
  email: string;
  password: string;
}
interface RegisterResponse {
  user: User;
}

interface ResetRequestPayload {
  email: string;
}
interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

interface User {
  id: string;
  email: string;
  createdAt: string;
}

class AuthService {
  login(payload: LoginRequest): Promise<LoginResponse>;
  register(payload: RegisterRequest): Promise<RegisterResponse>;
  logout(): Promise<void>;
  requestPasswordReset(payload: ResetRequestPayload): Promise<void>;
  resetPassword(payload: ResetPasswordPayload): Promise<void>;
  validateToken(token: string): Promise<User>;
  getCurrentUser(): User | null;
}
```

---

## `@app/auth` — `useAuth` hook

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

function useAuth(): AuthContextValue;
```

---

## `@app/api-client` — `ProjectsApiService`

```typescript
interface ProjectInput {
  name: string;
  brandValues: string;
  brandDesignGuidelines: string;
  audienceSocialMediaProfiles: string[]; // list of URLs/handles
}

interface Project extends ProjectInput {
  id: string;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  canvaLink?: string;
}

type ProjectStatus =
  | "DRAFT"
  | "PROCESSING"
  | "REPORT_READY"
  | "PRESENTATION_READY";

class ProjectsApiService {
  createProject(input: ProjectInput): Promise<Project>;
  getProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project>;
  updateProject(
    projectId: string,
    input: Partial<ProjectInput>,
  ): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
}
```

---

## `@app/api-client` — `ReportsApiService`

```typescript
interface ReportData {
  projectId: string;
  generatedAt: string;
  metrics: ReportMetric[];
}

interface ReportMetric {
  label: string;
  value: string | number;
  unit?: string;
}

class ReportsApiService {
  triggerReport(projectId: string): Promise<void>;
  getReportStatus(projectId: string): Promise<ProjectStatus>;
  getReportData(projectId: string): Promise<ReportData>;
}
```

---

## `@app/api-client` — `CanvaApiService`

```typescript
interface CanvaSetupRequest {
  projectId: string;
}
interface CanvaSetupResponse {
  sessionToken: string;
} // or TBD with backend team

interface CanvaGenerateRequest {
  projectId: string;
  sessionToken: string;
}
interface CanvaGenerateResponse {
  canvaLink: string;
}

class CanvaApiService {
  // Step 1 of the two-step Canva generation flow
  canvaSetup(payload: CanvaSetupRequest): Promise<CanvaSetupResponse>;
  // Step 2 of the two-step Canva generation flow
  canvaGenerate(payload: CanvaGenerateRequest): Promise<CanvaGenerateResponse>;
}
```

**Note**: `CanvaSetupResponse` and `CanvaGenerateRequest` fields are placeholders pending contract definition with the backend team.

---

## `@app/api-client` — `sseClient`

```typescript
interface SSEOptions {
  projectId: string;
  onStatusChange: (status: ProjectStatus) => void;
  onError: (error: Event) => void;
}

function createProjectStatusSSE(options: SSEOptions): EventSource;
// Returns an EventSource; caller is responsible for calling .close() on unmount
```

---

## `mfe-projects` — `ProjectForm`

```typescript
interface ProjectFormValues {
  name: string;
  brandValues: string;
  brandDesignGuidelines: string;
  audienceSocialMediaProfiles: string[];
}

interface ProjectFormProps {
  initialValues?: Partial<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  isLoading: boolean;
  submitLabel: string; // 'Create Project' | 'Save Changes'
}

// Validation schema (Formik + Yup)
const projectSchema = yup.object({
  name: yup.string().required().max(100),
  brandValues: yup.string().required().max(2000),
  brandDesignGuidelines: yup.string().required().max(5000),
  audienceSocialMediaProfiles: yup.array(yup.string().url()).min(1).required(),
});
```

---

## `mfe-reports` — `ReportPanel`

```typescript
interface ReportPanelProps {
  projectId: string;
  initialStatus: ProjectStatus;
}

// Internal hooks
function useProjectStatusSSE(projectId: string): {
  status: ProjectStatus;
  error: string | null;
};

function useReportData(
  projectId: string,
  enabled: boolean,
): {
  data: ReportData | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};
```

---

## `mfe-canva` — `CanvaPanel`

```typescript
interface CanvaPanelProps {
  projectId: string;
  reportReady: boolean; // true when status >= REPORT_READY
  existingCanvaLink?: string; // pre-populated if PRESENTATION_READY
}

// Internal hook
function useCanvaGeneration(projectId: string): {
  generate: () => Promise<void>;
  canvaLink: string | null;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
};
```

---

## `@app/ui` — Shared Component Signatures

```typescript
// Button
interface ButtonProps {
  variant: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Badge
interface BadgeProps {
  variant: "default" | "processing" | "success" | "error" | "info";
  label: string;
}

// EmptyState
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

// ErrorMessage
interface ErrorMessageProps {
  message: string; // generic, user-safe message
  onRetry?: () => void;
}
```
