# Requirements Document

# Marketing Audience Analysis Platform (ui)

**Version**: 1.0  
**Date**: 2026-04-07  
**Status**: Approved

---

## Intent Analysis Summary

| Attribute        | Value                                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Request** | UI app for marketing agencies to analyze audience: login, project management, audience data collection, report display from external API, Canva MCP connector, Canva presentation generation |
| **Request Type** | New Project (Greenfield)                                                                                                                                                                     |
| **Scope**        | System-wide — multi-module frontend SPA                                                                                                                                                      |
| **Complexity**   | Complex — multiple integration points, micro-frontend architecture, cloud deployment                                                                                                         |

---

## 1. Functional Requirements

### 1.1 Authentication

| ID         | Requirement                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------- |
| FR-AUTH-01 | Users MUST be able to register with email and password                                        |
| FR-AUTH-02 | Users MUST be able to log in with email and password                                          |
| FR-AUTH-03 | Users MUST be able to log out, invalidating their session                                     |
| FR-AUTH-04 | The application MUST enforce authenticated access on all routes except login and registration |
| FR-AUTH-05 | The application MUST support password reset via email                                         |

**Notes**:

- Single role system: all authenticated users have identical access rights
- Session management must comply with SECURITY-12 (secure/httpOnly/sameSite cookies, server-side expiration)

---

### 1.2 Project Management

| ID         | Requirement                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| FR-PROJ-01 | An authenticated user MUST be able to create a new project                                                                         |
| FR-PROJ-02 | Project creation form MUST capture: project name, brand values, brand design guidelines, audience social media profiles to analyze |
| FR-PROJ-03 | A user MUST be able to view a list of all their projects                                                                           |
| FR-PROJ-04 | A user MUST be able to open and edit an existing project's information                                                             |
| FR-PROJ-05 | A user MUST be able to delete a project they own                                                                                   |
| FR-PROJ-06 | Projects are private: one user owns many projects; no cross-user sharing                                                           |

**Project Data Model (required fields)**:

```
Project:
  - id (system-generated)
  - name (string, required)
  - brandValues (string / rich text, required)
  - brandDesignGuidelines (string / file references, required)
  - audienceSocialMediaProfiles (list of URLs / handles, required)
  - status (enum: DRAFT | PROCESSING | REPORT_READY | PRESENTATION_READY)
  - createdAt (timestamp)
  - updatedAt (timestamp)
  - ownerId (reference to authenticated user)
```

---

### 1.3 Report Collection (External API Integration)

| ID           | Requirement                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-REPORT-01 | The system MUST automatically trigger a report fetch from the external analysis API when a project reaches a defined "ready" status threshold                             |
| FR-REPORT-02 | The report fetch MUST be initiated without user intervention once the project data is complete                                                                            |
| FR-REPORT-03 | The UI MUST poll or subscribe to project status changes and update the view when a report becomes available                                                               |
| FR-REPORT-04 | The report view MUST display structured summary cards showing key audience analysis metrics                                                                               |
| FR-REPORT-05 | The UI MUST show a loading/processing state while the report is being generated                                                                                           |
| FR-REPORT-06 | The UI MUST handle and display error states if the external API fails to return a report                                                                                  |
| FR-REPORT-07 | External API credentials (API key) MUST be stored as backend environment variables and MUST NOT be exposed in the frontend bundle or network requests visible to the user |

**External API Interaction Pattern**:

```
Project SUBMITTED → external API called (server/proxy) → status polling → REPORT_READY → UI displays summary cards
```

---

### 1.4 Canva MCP Connector & Presentation Generation

| ID          | Requirement                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-CANVA-01 | The Canva read/write integration (MCP connector) is implemented on the backend (external project); the UI does not directly call Canva APIs |
| FR-CANVA-02 | The UI MUST expose a "Generate Presentation" button that becomes active once a report is available (status = REPORT_READY)                  |
| FR-CANVA-03 | Clicking "Generate Presentation" MUST invoke a two-step API flow on the backend before the Canva design is created                          |
| FR-CANVA-04 | Step 1 of the Canva flow: first backend API endpoint call (setup/auth step — exact contract TBD with backend team)                          |
| FR-CANVA-05 | Step 2 of the Canva flow: second backend API endpoint call (generate design — exact contract TBD with backend team)                         |
| FR-CANVA-06 | On successful completion, the UI MUST display a link to the generated Canva design; the user can click it to open Canva                     |
| FR-CANVA-07 | The UI MUST show progress states during the two-step Canva generation process                                                               |
| FR-CANVA-08 | The UI MUST handle and display error states if either Canva API step fails                                                                  |

---

## 2. Non-Functional Requirements

### 2.1 Architecture

| ID          | Requirement                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-ARCH-01 | The frontend MUST be implemented as a **micro-frontend architecture** using React with TypeScript                                                        |
| NFR-ARCH-02 | Each major domain (auth, projects, reports, Canva) MUST be designed as an independently deployable micro-frontend module                                 |
| NFR-ARCH-03 | The application MUST be a Single Page Application (SPA); there is no custom backend to build — all backend interactions go to the external project's API |
| NFR-ARCH-04 | The micro-frontend shell/host application MUST orchestrate module loading and routing                                                                    |
| NFR-ARCH-05 | Module communication MUST use a defined event bus or shared state contract — no direct module-to-module imports                                          |

### 2.2 Performance

| ID          | Requirement                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| NFR-PERF-01 | Target scale: fewer than 50 concurrent users (MVP/internal tool)                   |
| NFR-PERF-02 | Initial page load (LCP) MUST be under 3 seconds on a standard broadband connection |
| NFR-PERF-03 | Micro-frontend modules MUST be lazy-loaded to minimize initial bundle size         |

### 2.3 Security

Security rules are enforced at the **blocking** level. See `aidlc-docs/aidlc-state.md` — Extension: Security Baseline = Enabled.

Key security requirements derived from SECURITY rules:

| ID         | Requirement                                                                                             | SECURITY Rule |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------------- |
| NFR-SEC-01 | All communications MUST use HTTPS/TLS 1.2+                                                              | SECURITY-01   |
| NFR-SEC-02 | HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) MUST be set | SECURITY-04   |
| NFR-SEC-03 | All user inputs MUST be validated and sanitized before use                                              | SECURITY-05   |
| NFR-SEC-04 | All routes MUST require authentication by default; public routes are explicitly opt-out                 | SECURITY-08   |
| NFR-SEC-05 | CORS MUST be restricted to explicitly allowed origins; no wildcard `*` on authenticated endpoints       | SECURITY-08   |
| NFR-SEC-06 | JWT/session tokens MUST be validated on every request                                                   | SECURITY-08   |
| NFR-SEC-07 | Passwords MUST use adaptive hashing; sessions MUST expire and be invalidated on logout                  | SECURITY-12   |
| NFR-SEC-08 | Brute-force protection MUST be implemented on login endpoint                                            | SECURITY-12   |
| NFR-SEC-09 | No secrets, API keys, or tokens in frontend source code or version control                              | SECURITY-12   |
| NFR-SEC-10 | A global error handler MUST be configured; user-facing errors MUST be generic (no stack traces)         | SECURITY-15   |
| NFR-SEC-11 | All dependencies MUST use exact versions / lock files; vulnerability scanning in CI                     | SECURITY-10   |
| NFR-SEC-12 | Rate limiting MUST be configured on public-facing endpoints                                             | SECURITY-11   |
| NFR-SEC-13 | Structured logging with correlation IDs; no PII/secrets in logs                                         | SECURITY-03   |

### 2.4 Deployment

| ID            | Requirement                                                                        |
| ------------- | ---------------------------------------------------------------------------------- |
| NFR-DEPLOY-01 | The application MUST be deployed to AWS (primary cloud target)                     |
| NFR-DEPLOY-02 | Static assets MUST be served via a CDN (e.g., CloudFront)                          |
| NFR-DEPLOY-03 | Deployment MUST be containerized or use a static hosting service (S3 + CloudFront) |
| NFR-DEPLOY-04 | Infrastructure configuration MUST use Infrastructure-as-Code (IaC)                 |

### 2.5 Visual Design & Branding

| ID        | Requirement                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-UX-01 | The application MUST follow a **Chinoiserie** visual aesthetic — inspired by East Asian decorative art: ornate botanical and floral motifs, a refined palette of deep jade greens, porcelain blues, gold accents, and off-white/ivory backgrounds |
| NFR-UX-02 | Typography MUST feel classical and elegant — serif or semi-serif display fonts for headings; clean readable sans-serif for body text                                                                                                              |
| NFR-UX-03 | UI components (cards, panels, buttons, badges) MUST incorporate subtle decorative borders, delicate line patterns, or motif-inspired detailing consistent with the Chinoiserie style                                                              |
| NFR-UX-04 | The Tailwind design token system (colors, spacing, fonts) MUST be configured to encode the Chinoiserie palette and typography choices in `@app/ui/tailwind.config`                                                                                |
| NFR-UX-05 | All illustrations, icons, and decorative elements MUST be consistent with the Chinoiserie aesthetic — no generic flat/material design icons                                                                                                       |
| NFR-UX-06 | The visual style MUST remain consistent across all micro-frontend modules via the shared `@app/ui` component library                                                                                                                              |

### 2.6 Quality & Maintainability

| ID          | Requirement                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| NFR-QUAL-01 | TypeScript strict mode MUST be enabled across all modules                      |
| NFR-QUAL-02 | All components MUST have unit tests                                            |
| NFR-QUAL-03 | Integration tests MUST cover the external API interaction flows                |
| NFR-QUAL-04 | Delivery MUST follow phased approach: MVP first, then full production features |
| NFR-QUAL-05 | Property-based testing is **not enforced** (opted out — thin integration SPA)  |

---

## 3. User Scenarios

### 3.1 Happy Path — New User

```
1. User navigates to the app → sees login/register page
2. User registers with email and password
3. User is redirected to project dashboard (empty state)
4. User creates a new project → fills in name, brand values, design guidelines, social profiles
5. Project is saved → status = DRAFT → transitions to PROCESSING → external API called automatically
6. User sees "Processing..." state on project card
7. External API responds → status = REPORT_READY → report cards displayed
8. User reviews audience analysis summary cards
9. User clicks "Generate Presentation"
10. UI calls BE endpoint 1 → then BE endpoint 2
11. UI displays link to generated Canva design
12. User clicks link → opens Canva in new tab
```

### 3.2 Error Scenarios

| Scenario                     | Expected Behavior                                           |
| ---------------------------- | ----------------------------------------------------------- |
| External API timeout/failure | Show error state on project; allow retry                    |
| Canva endpoint 1 fails       | Show error message; do not call endpoint 2; allow retry     |
| Canva endpoint 2 fails       | Show error message; allow retry from step 2 or full restart |
| Login brute force            | Lock account / show CAPTCHA after N failures                |
| Invalid session token        | Redirect to login with generic error                        |

---

## 4. Out of Scope (This Phase)

- Multi-user collaboration / project sharing
- Social login (Google, GitHub, etc.)
- In-app Canva template selection UI (template handling is on the BE)
- Admin panel / user management dashboard
- Mobile native app (web SPA only)
- Custom analytics/charting beyond summary cards
- Real-time WebSocket notifications (polling is sufficient for MVP)

---

## 5. Integration Points

| System                | Direction                           | Protocol                 | Owned By                 |
| --------------------- | ----------------------------------- | ------------------------ | ------------------------ |
| Audience Analysis API | Outbound from UI (via proxy/BE)     | HTTPS/REST               | External project         |
| Canva MCP Backend     | Outbound from UI                    | HTTPS/REST (2-step flow) | External project         |
| Auth service          | TBD (could be embedded or external) | HTTPS/REST or OIDC       | This project or external |

---

## 6. Delivery Phasing

### Phase 1 — MVP

- Authentication (login, register, logout, password reset)
- Project CRUD (create, list, view, edit, delete)
- Automatic report fetch + status display
- Structured summary cards for report data
- "Generate Presentation" button + Canva link display

### Phase 2 — Production Hardening

- Full security header enforcement
- Rate limiting on all public endpoints
- CI/CD pipeline with vulnerability scanning
- Monitoring, alerting, log retention (90-day minimum)
- Performance optimization and lazy loading
- Full IaC for AWS deployment
