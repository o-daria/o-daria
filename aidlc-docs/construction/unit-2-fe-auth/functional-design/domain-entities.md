# Domain Entities — Unit 2: Frontend Authentication

## Entity: AuthToken (Value Object — stored in localStorage)

**Purpose**: The session token received from BE after Google login. Sent as `Authorization: Bearer <token>` on every API request.

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `token` | string | `localStorage['app.token']` | 64-char hex; never logged |

---

## Entity: User (stored in localStorage + React state)

**Purpose**: Represents the currently authenticated user in the FE session.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | string | BE response | UUID |
| `email` | string | BE response | Verified Google email |
| `name` | string \| null | BE response | Google display name; may be absent |
| `createdAt` | string | BE response | ISO 8601 |

**Existing interface** — extended to add `name` field.

---

## Entity: GoogleAuthResponse (Value Object — not persisted)

**Purpose**: The response from `POST /auth/google`.

| Field | Type | Notes |
|-------|------|-------|
| `token` | string | Session token |
| `user` | User | Authenticated user data |

---

## Entity: AuthState (React state — in-memory)

**Purpose**: Current authentication state held in `AuthContext`.

| Field | Type | Notes |
|-------|------|-------|
| `user` | User \| null | null while loading or unauthenticated |
| `isAuthenticated` | boolean | Derived: `user !== null` |
| `isLoading` | boolean | true during mount session restore |

---

## Flows

### Flow 1: Google Login
```
User clicks Google button
  → GoogleLogin component calls onSuccess(credentialResponse)
  → loginWithGoogle(credentialResponse.credential)
  → POST /auth/google { credential }
  → Response: { token, user }
  → tokenStorage.setToken(token) + tokenStorage.setUser(user)
  → apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  → setUser(user)
  → navigate('/projects')
```

### Flow 2: Session Restore (on page reload)
```
AuthProvider mounts
  → tokenStorage.getUser() + tokenStorage.getToken()
  → If both exist: setUser(user) + inject Authorization header into apiClient
  → setIsLoading(false)
  → Router sees isAuthenticated → stays on /projects (no redirect to /auth/login)
```

### Flow 3: Logout
```
User triggers logout
  → tokenStorage.clearAll()
  → delete apiClient.defaults.headers.common['Authorization']
  → setUser(null)
  → navigate('/auth/login')
```

### Flow 4: Automatic 401 Logout
```
apiClient receives 401 response
  → onUnauthorized() callback fires (registered in shell App.tsx)
  → navigate('/auth/login', { replace: true })
  → (AuthProvider logout clears storage on next login attempt)
```
