# Unit of Work Plan

# Marketing Audience Analysis Platform (ui)

**Phase**: INCEPTION — Units Generation  
**Status**: PLANNING — Awaiting user answers  
**Date**: 2026-04-07

---

## Execution Checklist

### Part 1 — Planning

- [x] Step 1: Create Unit of Work Plan (this document)
- [x] Step 2: Include mandatory unit artifacts in plan
- [x] Step 3: Generate clarifying questions (see Section 2)
- [x] Step 4: Store UOW Plan (this file)
- [x] Step 5: User fills in all [Answer]: tags
- [x] Step 6: Collect and validate answers
- [x] Step 7: Analyze answers for ambiguities — no contradictions; Q6 deferred to Infrastructure Design
- [x] Step 8: Follow-up clarification — N/A
- [x] Step 9: Plan approved — proceeding to generation

### Part 2 — Generation

- [x] Step 12: Generate unit-of-work.md
- [x] Step 12: Generate unit-of-work-dependency.md
- [x] Step 12: Generate unit-of-work-story-map.md
- [x] Step 14: Update progress and state
- [x] Step 16: Present completion message
- [x] Step 17: User approved — "Approve & Continue"
- [x] Step 19: Mark Units Generation COMPLETE in aidlc-state.md

---

## Section 1: Proposed Units (from Application Design)

The application design already established 5 natural units aligned to micro-frontend modules:

| Unit ID | Unit Name                        | Scope                                                                                   |
| ------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| U-01    | Shell / Host App                 | Module Federation host, top-level routing, AuthGuard, GlobalLayout, GlobalErrorBoundary |
| U-02    | Auth Module (`mfe-auth`)         | Registration, login, logout, password reset; `@app/auth` shared library                 |
| U-03    | Projects Module (`mfe-projects`) | Project CRUD, project list, project detail page, status badge                           |
| U-04    | Reports Module (`mfe-reports`)   | SSE status subscription, report card display, processing/error states                   |
| U-05    | Canva Module (`mfe-canva`)       | Two-step generation flow, progress states, Canva link display                           |

Shared packages (`@app/api-client`, `@app/ui`) are cross-cutting and will be built as part of U-01 (Shell setup) since they must exist before any MFE can be built.

---

## Section 2: Clarifying Questions

Please fill in the letter choice after each `[Answer]:` tag.

---

### Q1 — Repository Structure

How should the codebase be organised at the repository level?

A) Monorepo — all units (shell + 4 MFEs + shared packages) in one repository with a monorepo tool (e.g., pnpm workspaces + Turborepo)
B) Polyrepo — each unit in its own separate repository; shared packages published to a private npm registry
C) Hybrid — shared packages + shell in one repo; each MFE in its own repo
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2 — Build / Task Runner

Which build and task-runner tool should orchestrate the monorepo (if monorepo) or CI scripts?

A) Turborepo (fast incremental builds, excellent Module Federation support, low config overhead)
B) Nx (feature-rich, built-in generators, heavier setup)
C) pnpm workspaces only — no dedicated orchestration tool
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q3 — Shared Package Build Strategy

How should `@app/auth`, `@app/api-client`, and `@app/ui` be built and consumed by MFEs?

A) Built to dist and consumed as local workspace packages (symlinked in monorepo)
B) Exposed as Module Federation shared singletons only — no separate build step
C) Both: built as workspace packages for type safety + also declared as MFE shared singletons at runtime
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q4 — Development & Build Order

What is the preferred order for building units during development and CI?

A) Shared packages first → Shell → MFEs in parallel (recommended — respects dependencies)
B) All units built simultaneously (parallel) — CI determines order via dependency graph
C) Sequential: packages → Shell → Auth → Projects → Reports → Canva (strictly linear)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Q5 — Unit Boundary: Auth Library vs Auth MFE

The `@app/auth` shared library and `mfe-auth` are closely related. Should they be in the same unit of work or separate?

A) Same unit (U-02) — build `@app/auth` library and `mfe-auth` MFE together; one code generation pass
B) Separate — `@app/auth` is part of U-01 (Shell infrastructure); `mfe-auth` is its own unit U-02
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Q6 — Deployment Model

How will the MFE remotes be deployed? This affects how Module Federation remote URLs are configured.

A) All MFEs deployed to the same AWS S3 + CloudFront distribution, under different path prefixes
B) Each MFE deployed to its own CloudFront distribution / subdomain (true independent deployment)
C) Not decided yet — use environment variable placeholders for remote URLs; decide at infrastructure design stage
X) Other (please describe after [Answer]: tag below)

[Answer]: C
