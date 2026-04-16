# Application Design Plan

# Marketing Audience Analysis Platform (o_daria_ui)

**Phase**: INCEPTION — Application Design  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

- [x] Step 1: Analyze context (requirements.md, stories.md loaded)
- [x] Step 2: Create Application Design Plan (this document)
- [x] Step 3: Include mandatory design artifacts in plan
- [x] Step 4: Generate clarifying questions (see Section 2)
- [x] Step 5: Store Application Design Plan (this file)
- [x] Step 6: User fills in all [Answer]: tags
- [x] Step 7: Collect and validate all answers
- [x] Step 8: Analyze answers for ambiguities — no contradictions; SSE choice noted (requires backend SSE support)
- [x] Step 9: Follow-up clarification — N/A
- [x] Step 10: Generate application design artifacts
- [ ] Step 12: Await explicit user approval

---

## Section 1: Mandatory Artifacts (to be generated after answers)

| Artifact                  | Path                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| `components.md`           | `aidlc-docs/inception/application-design/components.md`                        |
| `component-methods.md`    | `aidlc-docs/inception/application-design/component-methods.md`                 |
| `services.md`             | `aidlc-docs/inception/application-design/services.md`                          |
| `component-dependency.md` | `aidlc-docs/inception/application-design/component-dependency.md`              |
| `application-design.md`   | `aidlc-docs/inception/application-design/application-design.md` (consolidated) |

---

## Section 2: Clarifying Questions

Please fill in the letter choice after each `[Answer]:` tag.  
If no option fits, choose X and describe your preference.

---

### Q1 — Micro-Frontend Framework

Which micro-frontend framework or approach should be used for module federation?

A) Webpack Module Federation (most mature, widely adopted with React)
B) Vite + vite-plugin-federation (modern build tool, faster DX)
C) Single-SPA (framework-agnostic micro-frontend orchestrator)
D) Nx Monorepo with module boundaries (monorepo, not true runtime federation)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2 — Shell / Host App Routing

How should routing be handled across micro-frontend modules?

A) React Router in the Shell — Shell owns all routes, modules render as route children
B) Each module owns its own sub-routes — Shell delegates routing to modules via prefix (e.g., `/projects/*` goes to Projects module)
C) Both: Shell handles top-level routes; modules handle their internal sub-routes independently
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q3 — Shared State / Auth Context

How should authentication state (current user, token) be shared between micro-frontend modules?

A) Shared library / singleton store — a shared `@app/auth-context` package exported from the Shell
B) Browser storage only — modules read token from localStorage/sessionStorage directly
C) Custom event bus — Shell broadcasts auth state changes; modules subscribe
D) URL/query params — stateless; each module validates its own token on every load
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q4 — UI Component Library

Should a shared UI component library be used across all micro-frontend modules?

A) Yes — use an established library (e.g., Ant Design, MUI / Material UI, Chakra UI)
B) Yes — use a headless library (e.g., Radix UI, shadcn/ui) with custom styling (Tailwind CSS)
C) No — each module uses its own styling; no shared UI library
D) Minimal shared — only a shared design tokens / CSS variables package; no component sharing
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q5 — API Communication Layer

How should the UI communicate with the external backend APIs (audience analysis API + Canva 2-step endpoints)?

A) Direct `fetch` / `axios` calls from each module — no abstraction layer
B) Centralized API service layer — a shared `@app/api-client` package with typed service classes used by all modules
C) React Query / TanStack Query — data fetching with caching and polling built in, per module
D) Both B and C — shared typed API client + React Query for state management on top
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

### Q6 — Authentication Implementation

Where should authentication logic (token storage, session validation, login/logout flows) live?

A) Auth Module only — self-contained; Shell imports auth guards from it
B) Shell App — Shell owns auth state and guards; Auth Module handles only the UI forms (login/register pages)
C) Dedicated shared `@app/auth` library — used by both Shell and Auth Module
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q7 — Project Status Polling

The project status must transition automatically (DRAFT → PROCESSING → REPORT_READY). How should the UI handle status polling?

A) Interval polling in the Reports module — poll the backend every N seconds when a project is in PROCESSING state
B) React Query's `refetchInterval` — automatic polling with built-in backoff managed by React Query
C) Server-Sent Events (SSE) — backend pushes status updates to the client in real time
D) WebSocket — bidirectional real-time connection for status updates
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q8 — Error Boundary Strategy

How should error boundaries be structured in the micro-frontend architecture?

A) One global error boundary in the Shell — catches all unhandled errors across all modules
B) Per-module error boundaries — each micro-frontend module has its own error boundary; Shell has a fallback
C) Both — per-module boundaries for module-level errors + global Shell boundary as final fallback
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q9 — Form Validation Library

Which library should be used for form validation (login, registration, project creation/edit)?

A) React Hook Form + Zod (lightweight, schema-based validation, TypeScript-first)
B) Formik + Yup (established, well-documented)
C) Native HTML5 validation only (no library)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q10 — CSS / Styling Approach

What styling approach should be used across the application?

A) Tailwind CSS (utility-first, consistent design tokens, no runtime overhead)
B) CSS Modules (scoped styles, no extra runtime, TypeScript-safe with typed-css-modules)
C) Styled Components / Emotion (CSS-in-JS, co-located with components)
D) A combination: Tailwind for layout/utility + CSS Modules for component-specific styles
X) Other (please describe after [Answer]: tag below)

[Answer]: A
