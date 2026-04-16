# Services Design

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07

---

## Service Layer Overview

The application uses a two-tier service pattern:

1. **API Services** (`@app/api-client`) — raw HTTP communication with the external backend. Typed, stateless, no caching.
2. **React Query hooks** (per MFE module) — data fetching orchestration, caching, background refresh, and SSE integration. Sit on top of API services.

```
Component
    |
    v
React Query Hook (per module)
    |
    v
@app/api-client Service
    |
    v
External Backend API
```

---

## `@app/auth` — AuthService

**Pattern**: Singleton service class  
**Responsibilities**:

- Call the auth backend endpoints (login, register, logout, password reset)
- Store and retrieve the access token via `tokenStorage`
- Expose the current authenticated user

**Session Management Rules**:

- Token is stored in an httpOnly cookie (set by the backend) — the JS layer never directly reads it
- `tokenStorage` provides an abstraction; on the frontend it stores the non-sensitive user profile only (not the raw token)
- Every API request attaches the auth cookie automatically (same-origin) or via Bearer header for cross-origin calls
- On logout, the service calls the backend to invalidate the session and clears local user state

**Integration with `@app/auth-context`**:

- `AuthProvider` wraps the application; it calls `AuthService.validateToken()` on mount to restore session
- `useAuth()` hook provides reactive access to auth state throughout all modules

---

## `@app/api-client` — ProjectsApiService

**Pattern**: Typed service class instantiated via `apiClient`  
**Responsibilities**:

- CRUD operations for projects via the external backend REST API
- All methods inject the auth token via the shared `apiClient` interceptor
- Returns typed `Project` objects; throws typed errors on failure

**React Query Integration** (in `mfe-projects`):

```typescript
// Queries
useQuery(["projects"], () => projectsApi.getProjects());
useQuery(["project", id], () => projectsApi.getProject(id));

// Mutations
useMutation(projectsApi.createProject);
useMutation((id, data) => projectsApi.updateProject(id, data));
useMutation(projectsApi.deleteProject);
```

---

## `@app/api-client` — ReportsApiService

**Pattern**: Typed service class  
**Responsibilities**:

- Trigger report generation on the external analysis API
- Fetch report data when status is REPORT_READY
- Does NOT poll — polling is replaced by SSE (see SSE Service below)

**React Query Integration** (in `mfe-reports`):

```typescript
// Fetch report data only when project is REPORT_READY
useQuery(["report", projectId], () => reportsApi.getReportData(projectId), {
  enabled: status === "REPORT_READY",
});
```

---

## `@app/api-client` — CanvaApiService

**Pattern**: Typed service class  
**Responsibilities**:

- Orchestrate the two-step Canva generation flow
- Step 1: `canvaSetup()` — initialises the Canva session with the backend
- Step 2: `canvaGenerate()` — triggers design creation; returns the Canva link

**React Query Integration** (in `mfe-canva`):

```typescript
// Sequential two-step mutation
const generateMutation = useMutation(async (projectId: string) => {
  const { sessionToken } = await canvaApi.canvaSetup({ projectId });
  const { canvaLink } = await canvaApi.canvaGenerate({
    projectId,
    sessionToken,
  });
  return canvaLink;
});
```

**Error handling**: If Step 1 fails, Step 2 is not called. If Step 2 fails, the user can retry the full flow.

---

## `@app/api-client` — SSE Service (`sseClient`)

**Pattern**: Factory function returning a native browser `EventSource`  
**Responsibilities**:

- Open a Server-Sent Events connection to the backend status stream for a given project
- Dispatch `onStatusChange` callbacks when the project status changes
- Dispatch `onError` callbacks on connection failure

**Integration in `mfe-reports` — `useProjectStatusSSE` hook**:

```typescript
function useProjectStatusSSE(projectId: string) {
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = createProjectStatusSSE({
      projectId,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (
          newStatus === "REPORT_READY" ||
          newStatus === "PRESENTATION_READY"
        ) {
          source.close(); // stop listening once terminal status reached
        }
      },
      onError: () => setError("Connection lost. Please refresh."),
    });
    return () => source.close(); // cleanup on unmount
  }, [projectId]);

  return { status, error };
}
```

**Note**: SSE requires the external backend to expose a `/projects/:id/status-stream` endpoint (or equivalent). If the backend does not support SSE, polling via React Query `refetchInterval` is the fallback.

---

## `@app/api-client` — `apiClient` (Shared HTTP Instance)

**Pattern**: Configured axios instance (singleton)  
**Responsibilities**:

- Set base URL from environment variable (`VITE_API_BASE_URL`)
- Attach auth token to every request via request interceptor
- Handle 401 responses — redirect to login via `@app/auth` logout
- Handle network errors — throw typed `ApiError` for consistent error handling in components

**Configuration**:

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // sends httpOnly auth cookie
  timeout: 30_000,
});

// Request interceptor: inject Bearer token for cross-origin calls if needed
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = "/auth/login";
    }
    return Promise.reject(new ApiError(error));
  },
);
```

---

## Service Interaction Summary

```
mfe-auth
  └── AuthService (@app/auth)
        └── apiClient (@app/api-client)

mfe-projects
  └── useQuery / useMutation (React Query)
        └── ProjectsApiService (@app/api-client)
              └── apiClient

mfe-reports
  ├── useProjectStatusSSE
  │     └── sseClient (@app/api-client)
  └── useQuery (React Query)
        └── ReportsApiService (@app/api-client)
              └── apiClient

mfe-canva
  └── useMutation (React Query, sequential)
        └── CanvaApiService (@app/api-client)
              └── apiClient
```
