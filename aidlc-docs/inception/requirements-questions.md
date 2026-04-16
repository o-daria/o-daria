# Requirements Analysis Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
If none of the options match, choose the last option (Other/X) and describe your preference.
Let me know when you're done.

---

## Question 1

What is the target deployment environment for the production-like setup?

A) AWS (S3 + CloudFront for FE, separate BE hosting — keep existing Terraform, simplify to 1 CloudFront distribution)
B) Single VPS / Docker Compose (Hetzner, DigitalOcean ~$6-20/mo — nginx + api + db + ollama in one compose)
C) Managed PaaS (Railway/Render for BE, Cloudflare Pages/Netlify for FE — no server maintenance)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2

For Google Sign-In access control, who should be allowed to log in?

A) Any Google account — first login auto-creates a tenant (open access, good for demos)
B) Whitelist specific Google email addresses only (controlled access via ALLOWED_EMAILS env var)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3

How should file uploads (Instagram profile images) be handled in the production deployment?

A) Keep current in-memory approach (Multer memoryStorage) — images processed and discarded, not persisted across deploys
B) Add persistent cloud storage (AWS S3 / GCS bucket) — images stored and re-usable across pipeline runs
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 4

For local testing, which approach is preferred?

A) Single `docker compose up` for a full production preview (builds FE static files + nginx + api + db + ollama)
B) Two-step: BE via docker compose + FE via `pnpm dev` with HMR (existing workflow, documented clearly)
C) Both: a new `docker-compose.local.yml` for full-stack preview AND the existing HMR dev workflow
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 5

What is the expected scope of changes to existing tests?

A) Keep all existing tests passing — no breaking changes to test interfaces
B) Update tests to reflect the new auth contract (replace login/password tests with Google auth tests)
C) Minimal — only fix tests that break due to auth interface changes, don't add new tests
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6

Should the existing email/password auth UI (Register, ForgotPassword, ResetPassword pages) be removed?

A) Yes — remove those pages entirely (Google-only auth, simplify the codebase)
B) Keep them but make them unreachable (remove routes, leave code in place)
C) Keep them fully functional alongside Google login as a future fallback
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question: Security Extensions

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question: Property-Based Testing Extension

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---
