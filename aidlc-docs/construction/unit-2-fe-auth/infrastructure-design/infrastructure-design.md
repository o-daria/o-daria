# Infrastructure Design — Unit 2: Frontend Authentication

## Build Environment

| Environment               | How `GOOGLE_CLIENT_ID` is provided                                         |
| ------------------------- | -------------------------------------------------------------------------- |
| Local dev (HMR)           | `.env` file in `ui/` root, read by webpack via `process.env`               |
| Local full-stack (Unit 3) | Build arg in `docker-compose.local.yml` → `Dockerfile.local` ARG → webpack |
| Production CI/CD          | GitHub Actions secret `GOOGLE_CLIENT_ID` injected as build env var         |

## Module Federation Impact

No Module Federation topology changes in this unit. The `@app/auth` package remains a singleton shared module. `@react-oauth/google` is added as a regular dependency of `mfe-auth` — it does NOT need to be in the shared config because it is consumed only through `@app/auth` which re-exports the `GoogleOAuthProvider` placement logic.

**Why `GoogleOAuthProvider` goes in shell, not mfe-auth:**

- `@app/auth` is a singleton — only one instance loads across shell + all remotes
- Google OAuth context must be available before any MFE mounts
- Shell is the Module Federation host that bootstraps first — wrapping `InnerApp` in `GoogleOAuthProvider` ensures context is present for all remotes

## New Environment Variable

| Variable           | Where Set                             | Purpose                                             |
| ------------------ | ------------------------------------- | --------------------------------------------------- |
| `GOOGLE_CLIENT_ID` | Build-time env (webpack DefinePlugin) | Passed to `GoogleOAuthProvider` + baked into bundle |

Added to `ui/.env.example` as a reminder.

## No Runtime Infrastructure Changes

Unit 2 has zero runtime infrastructure changes — no new Docker services, no new S3 buckets, no new routes on the BE. All changes are FE source + build config only.
