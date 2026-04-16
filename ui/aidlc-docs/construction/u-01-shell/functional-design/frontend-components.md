# Frontend Components — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## Component Hierarchy

```
<App>                              ← Shell entry point
  <AuthProvider>                   ← @app/auth: provides AuthContext
    <BrowserRouter>
      <GlobalErrorBoundary>        ← Shell: top-level catch-all
        <AppRouter>                ← Shell: route definitions
          ├── /auth/*  → <ModuleLoader remote="mfe-auth">      (public)
          └── (protected routes wrapped in <AuthGuard>)
               ├── /projects/*  → <ModuleLoader remote="mfe-projects">
               │     (mfe-projects renders <ReportPanel> and <CanvaPanel> as slots)
               └── /           → <Navigate to="/projects">
        <GlobalLayout>             ← Renders sidebar + page content outlet
          <Sidebar>
            <SidebarLogo />
            <SidebarNav />
            <SidebarUserSection />
          </Sidebar>
          <PageContent>
            <Outlet />             ← Active MFE renders here
          </PageContent>
        </GlobalLayout>
      </GlobalErrorBoundary>
    </BrowserRouter>
  </AuthProvider>
</App>
```

---

## Shell Components

### `AppRouter`
**Props**: none  
**State**: none (derives routes from static `RouteConfig[]`)  
**Behaviour**:
- Maps each `RouteConfig` to a `<Route>` element
- Public routes: render `<ModuleLoader>` directly
- Protected routes: wrap `<ModuleLoader>` in `<AuthGuard>`
- Redirect `/` → `/projects`
- Catch-all `*` → `<NotFoundPage>`

---

### `AuthGuard`
**Props**: `{ children: ReactNode; redirectTo?: string }`  
**State**: reads from `AuthContext`  
**Behaviour**:
- `isLoading` → render `<Spinner size="lg" />` (full-screen centered)
- `!isAuthenticated` → `<Navigate to="/auth/login" replace />`
- `isAuthenticated` → render `children`

---

### `GlobalLayout`
**Props**: `{ children: ReactNode }`  
**State**: none (sidebar state lives in `<Sidebar>`)  
**Structure**:
```
<div class="flex h-screen bg-surface">
  <Sidebar />
  <main class="flex-1 overflow-auto p-6">
    {children}
  </main>
</div>
```

---

### `Sidebar`
**Props**: none  
**State**: `collapsed: boolean` (from localStorage, toggled by button)  
**Chinoiserie styling**: background `ink.DEFAULT` (#1C2B22), text `ivory.DEFAULT`  
**Structure**:
```
<aside class="flex flex-col h-full bg-ink transition-width">
  <SidebarLogo collapsed={collapsed} />
  <SidebarNav collapsed={collapsed} />
  <SidebarToggle onClick={toggle} collapsed={collapsed} />
  <SidebarUserSection collapsed={collapsed} />
</aside>
```

---

### `SidebarLogo`
**Props**: `{ collapsed: boolean }`  
**Behaviour**: Shows full logo + app name when expanded; icon only when collapsed  
**Visual**: Chinoiserie botanical motif icon; display font for app name

---

### `SidebarNav`
**Props**: `{ collapsed: boolean }`  
**Behaviour**: Renders nav items; highlights active route via `useMatch`  
**Nav items**: Projects (`/projects`, folder icon)  
**Active style**: jade background `#2D6A4F`, ivory text

---

### `SidebarUserSection`
**Props**: `{ collapsed: boolean }`  
**State**: reads `user.email` from `useAuth()`  
**Behaviour**:
- Shows user email (truncated) when expanded; avatar initials when collapsed
- Logout button calls `authService.logout()` → clears localStorage → redirects to `/auth/login`

---

### `GlobalErrorBoundary`
**Props**: `{ children: ReactNode }`  
**Behaviour**:
- Catches any unhandled React render error from any child (including MFEs)
- Logs error internally (no PII/stack trace in production logs)
- Renders: `<ErrorMessage message="Something went wrong. Please refresh the page." />`
- "Refresh" button: `window.location.reload()`

---

### `ModuleLoader`
**Props**: `{ remote: string; fallback?: ReactNode }`  
**Behaviour**:
- Wraps `React.lazy(() => import(remote))` in `<Suspense>` + `<ErrorBoundary>`
- Suspense fallback: `<Spinner />` (centered in page content area)
- Error fallback: `<ErrorMessage message="Failed to load module." onRetry={retry} />`

---

## `@app/auth` Components

### `AuthProvider`
**Props**: `{ children: ReactNode }`  
**State**: `AuthState` — `{ user, isAuthenticated, isLoading }`  
**On mount**: restore from localStorage per BR-AUTH-01  
**Context value**: `{ user, isAuthenticated, isLoading, login, logout }`

---

## `@app/ui` Component Props (Full Specification)

### `Button`
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;   // shows Spinner, disables interaction
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```
**Chinoiserie styles**:
- `primary`: bg `button-primary-bg` (jade), text ivory, hover `button-primary-hover`
- `secondary`: bg ivory, border gold, text ink
- `destructive`: bg `error` (terracotta), text white
- `ghost`: transparent, text jade, hover bg `surface-elevated`

---

### `Input`
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;       // shows error message below input
  helpText?: string;
}
```
**Chinoiserie styles**: ivory background, neutral border, porcelain focus ring, error border in terracotta

---

### `Card`
```typescript
interface CardProps {
  children: ReactNode;
  className?: string;
  decorative?: boolean;  // adds gold border + subtle botanical corner motif via CSS
}
```

---

### `Badge`
```typescript
interface BadgeProps {
  variant: 'draft' | 'processing' | 'report-ready' | 'presentation-ready' | 'error';
  label: string;
}
```
**Variant mapping**:
- `draft` → neutral gray
- `processing` → porcelain blue bg
- `report-ready` → jade green bg
- `presentation-ready` → gold bg
- `error` → terracotta bg

---

### `Dialog`
```typescript
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;  // typically Button components
}
```

---

### `Spinner`
```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```
**Style**: animated jade/gold ring

---

### `ErrorMessage`
```typescript
interface ErrorMessageProps {
  message: string;        // generic user-safe string only
  onRetry?: () => void;   // shows "Try Again" button if provided
}
```

---

### `EmptyState`
```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  illustration?: ReactNode;  // slot for Chinoiserie botanical SVG
  action?: { label: string; onClick: () => void };
}
```

---

### `DecorativeDivider`
```typescript
interface DecorativeDividerProps {
  className?: string;
}
```
**Style**: thin gold horizontal rule with a small botanical motif centered via CSS `::before`/`::after`
