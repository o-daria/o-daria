# Code Generation Plan — U-01: Shell & Shared Infrastructure
# Marketing Audience Analysis Platform (o_daria_ui)

**Phase**: CONSTRUCTION — Code Generation  
**Unit**: U-01 Shell & Shared Infrastructure  
**Status**: Part 1 — PLANNING  
**Date**: 2026-04-07

---

## Unit Context

| Attribute | Value |
|---|---|
| Workspace root | `/Users/vi-kaivladyslav_fanh/Documents/o_daria/o_daria_ui` |
| Project type | Greenfield — multi-unit monorepo |
| Code location | `apps/shell/`, `packages/@app/auth/`, `packages/@app/api-client/`, `packages/@app/ui/` |
| Documentation | `aidlc-docs/construction/u-01-shell/code/` (markdown summaries only) |
| Stories | US-AUTH-02 (partial — AuthGuard), US-AUTH-03 (partial — logout button) |
| Dependencies | None (U-01 is the foundation; all other units depend on it) |

---

## Stories Implemented by This Unit

| Story | Component | Coverage |
|---|---|---|
| US-AUTH-02 | `AuthGuard`, `AuthProvider`, `AuthService.login()` | Route protection + session restore |
| US-AUTH-03 | `SidebarUserSection` logout button, `AuthService.logout()` | Logout flow |

---

## Part 1 Checklist (Planning)

- [x] Step 1: Analyze unit context and design artifacts
- [x] Step 2: Create detailed code generation plan (this document)
- [x] Step 3: Include unit generation context
- [x] Step 4: Create plan document (this file)
- [x] Step 5: Summarize plan
- [x] Step 6: Log approval prompt
- [x] Step 7: User approved — "Approve & Continue"
- [x] Step 8: Record approval response — "Continue. Make it so that I can test the app locally in the next iteration."
- [x] Step 9: Update progress — U-01 Code Generation COMPLETE

---

## Part 2 Checklist (Generation)

### Phase A — Monorepo Setup

- [x] **Step A-01**: Create monorepo root config files
  - `package.json` (pnpm workspaces root)
  - `pnpm-workspace.yaml`
  - `turbo.json` (Turborepo pipeline)
  - `.npmrc`
  - `tsconfig.base.json` (shared TypeScript config)
  - `.gitignore`
  - `.env.example` (documents all required env vars)

### Phase B — `packages/@app/ui` (Chinoiserie Design System)

- [x] **Step B-01**: Package scaffold
  - `packages/@app/ui/package.json`
  - `packages/@app/ui/tsconfig.json`
  - `packages/@app/ui/tailwind.config.ts` ← full Chinoiserie token set
  - `packages/@app/ui/src/index.ts` ← public API barrel

- [x] **Step B-02**: Core UI components
  - `packages/@app/ui/src/components/Button.tsx` + test
  - `packages/@app/ui/src/components/Input.tsx` + test
  - `packages/@app/ui/src/components/Card.tsx` + test
  - `packages/@app/ui/src/components/Badge.tsx` + test
  - `packages/@app/ui/src/components/Dialog.tsx` + test
  - `packages/@app/ui/src/components/Spinner.tsx` + test
  - `packages/@app/ui/src/components/ErrorMessage.tsx` + test
  - `packages/@app/ui/src/components/EmptyState.tsx` + test
  - `packages/@app/ui/src/components/DecorativeDivider.tsx` + test

- [x] **Step B-03**: UI package summary doc
  - `aidlc-docs/construction/u-01-shell/code/ui-package-summary.md`

### Phase C — `packages/@app/auth`

- [x] **Step C-01**: Package scaffold
  - `packages/@app/auth/package.json`
  - `packages/@app/auth/tsconfig.json`
  - `packages/@app/auth/src/index.ts`

- [x] **Step C-02**: Token storage + types
- [x] **Step C-03**: Auth service
- [x] **Step C-04**: Auth context + hook
- [x] **Step C-05**: Auth guard HOC
- [x] **Step C-06**: Auth package summary doc (included in shell-app-summary.md)

### Phase D — `packages/@app/api-client`

- [x] **Step D-01**: Package scaffold
  - `packages/@app/api-client/package.json`
  - `packages/@app/api-client/tsconfig.json`
  - `packages/@app/api-client/src/index.ts`

- [x] **Step D-02**: Types and errors
- [x] **Step D-03**: Logger service (pluggable transport)
- [x] **Step D-04**: Axios client instance + interceptors
- [x] **Step D-05**: API services (Projects, Reports, Canva)
- [x] **Step D-06**: SSE client
- [x] **Step D-07**: API client package summary doc (included in shell-app-summary.md)

### Phase E — `apps/shell`

- [x] **Step E-01**: Shell app scaffold
- [x] **Step E-02**: Shell entry + providers
- [x] **Step E-03**: Routing
- [x] **Step E-04**: Auth guard (US-AUTH-02)
- [x] **Step E-05**: Module loader
- [x] **Step E-06**: Global error boundary
- [x] **Step E-07**: Layout + Sidebar (US-AUTH-03)
- [x] **Step E-08**: Shell code summary doc

### Phase F — Infrastructure (Terraform)

- [x] **Step F-01**: Terraform structure + modules
  - `infra/terraform/main.tf`
  - `infra/terraform/variables.tf`
  - `infra/terraform/outputs.tf`
  - `infra/terraform/terraform.tfvars.prod`
  - `infra/terraform/modules/s3-hosting/main.tf`
  - `infra/terraform/modules/cloudfront/main.tf`
  - `infra/terraform/modules/iam-deploy/main.tf`

### Phase G — CI/CD

- [x] **Step G-01**: GitHub Actions workflow
  - `.github/workflows/deploy.yml`
  - `.github/workflows/pr-checks.yml`

---

## Story Traceability

| Story | Steps | Status |
|---|---|---|
| US-AUTH-02 (AuthGuard) | C-03, C-04, C-05, E-04 | [x] |
| US-AUTH-03 (logout button) | C-03, C-04, E-07 | [x] |
