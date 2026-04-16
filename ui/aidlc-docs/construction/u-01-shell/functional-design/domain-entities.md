# Domain Entities — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## Core Entities

### User
Represents an authenticated application user.

```typescript
interface User {
  id: string;           // UUID, assigned by backend
  email: string;        // Validated email address
  createdAt: string;    // ISO 8601 timestamp
}
```

**Persistence**: Non-sensitive user profile stored in `localStorage` under key `app.user`. The raw JWT/session token is managed exclusively by the backend via httpOnly cookie — it is never stored or read in JS.

---

### AuthState
Represents the current authentication state held in React context.

```typescript
interface AuthState {
  user: User | null;       // null = unauthenticated
  isAuthenticated: boolean;
  isLoading: boolean;      // true during initial restore from localStorage
}
```

**Initial load behaviour**: On `AuthProvider` mount, read `localStorage['app.user']`. If present, populate `user` and set `isAuthenticated = true` without a network call. Trust this until an API call returns 401.

---

### ApiError
Typed error thrown by `apiClient` on any non-2xx response.

```typescript
class ApiError extends Error {
  statusCode: number;   // HTTP status code (400, 401, 403, 404, 500, etc.)
  errorCode: string;    // Application-level error code from backend (e.g. "AUTH_INVALID_CREDENTIALS")
  message: string;      // User-safe generic message (never a stack trace)

  constructor(statusCode: number, errorCode: string, message: string);
  isUnauthorized(): boolean;   // statusCode === 401
  isForbidden(): boolean;      // statusCode === 403
  isNotFound(): boolean;       // statusCode === 404
  isServerError(): boolean;    // statusCode >= 500
}
```

---

### Route
Represents a top-level application route entry in the Shell router.

```typescript
interface RouteConfig {
  path: string;
  remoteModule: string;  // e.g. "mfe-auth/Module"
  isPublic: boolean;     // public = no auth required
}

const routes: RouteConfig[] = [
  { path: '/auth/*',     remoteModule: 'mfe_auth/Module',     isPublic: true  },
  { path: '/projects/*', remoteModule: 'mfe_projects/Module', isPublic: false },
  { path: '/',           remoteModule: 'redirect:/projects',  isPublic: false },
];
```

---

## Design Token Entities (`@app/ui`)

### ChinisoserieTokens
Full design system token set for the Chinoiserie aesthetic.

```typescript
// Encoded in tailwind.config.ts — consumed by all modules

const palette = {
  // Core palette
  jade:      { DEFAULT: '#2D6A4F', light: '#52B788', dark: '#1B4332' },
  porcelain: { DEFAULT: '#4A7FA5', light: '#74B3CE', dark: '#2C5F7A' },
  gold:      { DEFAULT: '#C9A84C', light: '#E9C46A', dark: '#9A7B2E' },
  ivory:     { DEFAULT: '#F5F0E8', dark: '#EDE4D3'                   },
  ink:       { DEFAULT: '#1C2B22', light: '#2D3F35'                  },

  // Semantic tokens
  success:   '#2D6A4F',   // jade
  warning:   '#C9A84C',   // gold
  error:     '#C1440E',   // terracotta
  info:      '#4A7FA5',   // porcelain
  disabled:  '#9CA3AF',   // neutral gray

  // Surface tokens
  surface:       '#FAF6EE',  // warm off-white
  surfaceElevated: '#F0EAD8',
  surfaceDark:   '#1C2B22',

  // Component-level tokens
  buttonPrimaryBg:     '#2D6A4F',  // jade
  buttonPrimaryHover:  '#1B4332',
  buttonSecondaryBg:   '#F5F0E8',  // ivory
  buttonSecondaryBorder: '#C9A84C', // gold
  cardBorder:          '#C9A84C',  // gold — decorative card border
  cardBg:              '#FAF6EE',
  inputBorder:         '#9CA3AF',
  inputFocusBorder:    '#4A7FA5',  // porcelain blue focus ring
  badgeProcessingBg:   '#EDE4D3',
  badgeSuccessBg:      '#D1FAE5',
  sidebarBg:           '#1C2B22',  // ink dark
  sidebarText:         '#F5F0E8',  // ivory
  sidebarActiveItem:   '#2D6A4F',  // jade
};

const typography = {
  fontDisplay: '"Cormorant Garamond", "IM Fell English", serif',
  fontBody:    '"Inter", "DM Sans", sans-serif',
};
```
