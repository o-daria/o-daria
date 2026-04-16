# Functional Design Plan — U-01: Shell & Shared Infrastructure

# Marketing Audience Analysis Platform (o_daria_ui)

**Phase**: CONSTRUCTION — Functional Design  
**Unit**: U-01 Shell & Shared Infrastructure  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

- [x] Step 1: Analyze unit context (unit-of-work.md, story-map.md loaded)
- [x] Step 2: Create Functional Design Plan (this document)
- [x] Step 3: Generate clarifying questions (see Section 2)
- [x] Step 4: Store plan (this file)
- [x] Step 5: Collect and analyze answers — no contradictions; localStorage stores user profile only (not JWT); JWT via httpOnly cookie
- [x] Step 6: Generate functional design artifacts
- [x] Step 7: Present completion message
- [x] Step 8: User approved — "Continue to Next Stage"

---

## Unit Scope Reminder

U-01 covers:

- `apps/shell` — Module Federation host, routing, `AuthGuard`, `GlobalLayout`, `GlobalErrorBoundary`
- `packages/@app/auth` — `AuthProvider`, `useAuth`, `AuthService`, `tokenStorage`, `withAuthGuard`
- `packages/@app/api-client` — `apiClient`, all API service classes, `sseClient`
- `packages/@app/ui` — Chinoiserie component library (shadcn/ui + Tailwind)

**Stories**: US-AUTH-02 (AuthGuard), US-AUTH-03 (logout)

---

## Section 2: Clarifying Questions

Please fill in the letter choice after each `[Answer]:` tag.

---

### Q1 — Session Storage Mechanism

Where should the auth session data (user profile, auth status) be stored on the client?

A) React context only — in-memory; lost on page refresh (requires re-validation on every mount)
B) React context + sessionStorage — persists for the browser tab session; cleared on tab close
C) React context + localStorage — persists across tabs and browser restarts (less secure)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q2 — Token Validation on App Load

When the app loads (or the user refreshes the page), how should auth state be restored?

A) Call a `/auth/me` (or equivalent) endpoint to validate the session server-side and restore user data
B) Trust the stored session data without re-validating — treat as valid until an API call returns 401
C) No persistence — user must log in again on every page load
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Q3 — Global Navigation Structure

What should the `GlobalLayout` navigation include?

A) Top header bar — logo, navigation links (Projects), user email + logout button
B) Left sidebar — collapsed/expanded navigation + user section at the bottom
C) Minimal — only logo and logout; no in-app navigation links (modules handle their own nav)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Q4 — Unauthenticated Redirect Behaviour

After a successful login, where should the user be redirected?

A) Always to `/projects` (project dashboard) — fixed destination
B) To the originally requested URL if the user was redirected from a protected route (return URL pattern)
C) To a configurable default route set in the Shell config
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Q5 — API Client Error Classification

How should the shared `apiClient` classify and surface errors to consuming components?

A) Simple: throw a generic `Error` with a message string — components handle all error UI themselves
B) Typed: throw a typed `ApiError` class with `statusCode`, `message`, and `errorCode` fields — components can branch on error type
C) Result pattern: return `{ data, error }` tuples — no thrown exceptions; components always check the error field
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Q6 — Chinoiserie UI — Design Token Scope

For the `@app/ui` Tailwind config, which colour tokens need to be defined at this stage?

A) Core palette only — primary (jade), accent (gold), background (ivory), text, error, surface colours
B) Full design system — core palette + semantic tokens (success, warning, info, disabled) + component-level tokens (button-primary-bg, card-border, etc.)
C) Minimal — only what's needed to unblock U-02 through U-05; full design system refined later
X) Other (please describe after [Answer]: tag below)

[Answer]: B
