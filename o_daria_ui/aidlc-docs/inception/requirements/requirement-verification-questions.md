# Requirements Verification Questions

# Marketing Audience Analysis Platform (o_daria_ui)

Please answer each question by filling in the letter choice after the `[Answer]:` tag.  
If none of the options match your needs, choose the last option (Other/X) and describe your preference after the tag.  
Let me know when you are done so I can proceed.

---

## Section 1: Authentication & Users

## Question 1

What type of authentication should be supported?

A) Email and password (standard form-based login)
B) Social login only (Google, GitHub, etc.)
C) Email/password + social login options
D) SSO / Enterprise (SAML, OIDC)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2

Will there be multiple user roles with different permissions?

A) No — all users have the same access (single role)
B) Yes — Admin and regular User roles
C) Yes — Admin, Agency Manager, and Analyst roles (multi-tier)
D) Yes — roles will be defined per-project (project-level permissions)
X) Other (please describe after [Answer]: tag below)

## [Answer]: A

## Section 2: Projects

## Question 3

What information should a user provide when creating a project?

A) Minimal: project name and description only
B) Standard: name, description, target audience details, and geographic/demographic scope
C) Comprehensive: name, description, audience profile, campaign objectives, budget range, timeline
X) Other (please describe after [Answer]: tag below)

[Answer]: X

name, brand values, brand design guidelines, audience social media profiles to analyze

---

## Question 4

Can a user belong to multiple projects, and can multiple users collaborate on the same project?

A) No — one user, one project at a time
B) Yes — one user can have many projects, but projects are private (not shared)
C) Yes — multiple users can collaborate on a shared project (team workspace)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 3: Reports & External API

## Question 5

How will the app interact with the external API that produces the audience analysis reports?

A) User triggers a manual "Fetch Report" action; result is displayed in the UI
B) Reports are fetched automatically when a project reaches a certain status/threshold
C) Both: automatic polling with a manual refresh option
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 6

What should the report view display?

A) Raw JSON / data table — developers / analysts interpret the data themselves
B) Structured summary cards — key metrics displayed as visual summary cards
C) Rich dashboard — charts, graphs, KPIs, downloadable data
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 7

Is authentication required to call the external API, and if so, how is the credential stored?

A) No auth required — the external API is open
B) Yes — API key stored in environment variables on the backend; UI never sees it
C) Yes — user provides their own API key per project (stored per-project in the app)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 4: Canva MCP Connector

## Question 8

What Canva integration capabilities are needed?

A) Read-only — retrieve Canva designs/templates for selection in the UI
B) Write — generate new Canva presentations from report data (automated creation)
C) Both read and write — select a template, then auto-populate it with report data
X) Other (please describe after [Answer]: tag below)

[Answer]: X

The read and write functionality is implemented on BE side.
The user gets the links to generated designs in Canva

---

## Question 9

How should the Canva presentation generation be triggered?

A) User clicks "Generate Presentation" button after a report is available
B) Automatically generated once a report is fetched
C) User can configure the template/style before generating
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 10

Do you already have Canva API credentials or MCP server details for the integration?

A) Yes — I have Canva API credentials and can share the MCP server endpoint
B) Partially — I have a Canva account but the API access is not yet set up
C) No — this needs to be designed with placeholder/stub integration initially
X) Other (please describe after [Answer]: tag below)

[Answer]: X

The Cana MCP integration is implemented on BE side. There are two API endpoints that user should go through before generating a Canva design.

---

## Section 5: Tech Stack & Deployment

## Question 11

What frontend framework / tech stack do you prefer?

A) React with TypeScript (recommended — widely used, strong ecosystem)
B) Next.js with TypeScript (React + SSR, good for SEO and API routes)
C) Vue.js with TypeScript
D) Angular with TypeScript
X) Other (please describe after [Answer]: tag below)

[Answer]: X

React with Typescript. Micro-frontend architecture.

---

## Question 12

What backend approach do you prefer?

A) Node.js / Express (or Fastify) — JavaScript/TypeScript backend
B) Next.js API routes — unified frontend + backend in one project
C) Python (FastAPI or Django) — separate backend service
D) No backend needed — the UI calls external APIs directly (frontend-only SPA)
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 13

Where will the application be deployed?

A) Cloud (AWS, Azure, or GCP) — needs cloud-native setup
B) Vercel / Netlify — JAMstack / serverless deployment
C) Docker container on a VPS / on-premises server
D) Not decided yet — keep infrastructure-agnostic for now
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 6: Non-Functional Requirements

## Question 14

What is the expected user scale for this application?

A) Small — fewer than 50 concurrent users (internal tool / MVP)
B) Medium — 50–500 concurrent users (agency-wide rollout)
C) Large — 500+ concurrent users (multi-agency SaaS platform)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 15

What is the target timeline or delivery expectation?

A) MVP as fast as possible — minimal features, get it running first
B) Production-ready with proper architecture but phased delivery (MVP → full product)
C) Full production-ready application in one pass
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 7: Extensions

## Question 16 — Security Extension

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 17 — Property-Based Testing Extension

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers)
X) Other (please describe after [Answer]: tag below)

[Answer]: B
