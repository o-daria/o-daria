# Deployment Architecture — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07

---

## Deployment Topology

```
+----------------------------------------------------------+
|  GitHub Repository (ui monorepo)                 |
|                                                          |
|  push to main                                            |
|      |                                                   |
|      v                                                   |
|  GitHub Actions                                          |
|    1. validate (type-check, lint, test, audit)           |
|    2. build (Turborepo: packages → shell → MFEs)         |
|    3. deploy:                                            |
|       - s3 sync (per MFE path)                           |
|       - CloudFront invalidation /*                       |
+----------------------------------------------------------+
                          |
                          | AWS credentials (GitHub Secrets)
                          v
+----------------------------------------------------------+
|  AWS Account (Production)                                |
|                                                          |
|  +--------------------+    +-------------------------+  |
|  | S3: o-daria-ui-prod|    | CloudFront Distribution |  |
|  |                    |<---|  (*.cloudfront.net)      |  |
|  | /shell/            |    |                         |  |
|  | /mfe-auth/         |    |  Origin: S3 (OAC)       |  |
|  | /mfe-projects/     |    |  HTTPS redirect: on     |  |
|  | /mfe-reports/      |    |  Default root: shell/   |  |
|  | /mfe-canva/        |    |    index.html           |  |
|  |                    |    |  Security headers: set  |  |
|  | SSE-S3 encrypted   |    |  CSP: defined           |  |
|  | Public access: off |    |  SPA 404→200: enabled   |  |
|  +--------------------+    +-------------------------+  |
|                                         |               |
|  +--------------------+                |               |
|  | S3: tfstate bucket |                |               |
|  | DynamoDB lock table|                |               |
|  +--------------------+                |               |
|                                        v               |
|                                   End User Browser     |
+----------------------------------------------------------+
                                         |
                                         | connect-src (HTTPS)
                                         v
                              External Backend API
                              (separate project)
```

---

## Build → Deploy Flow per Unit

```
Turborepo build pipeline:

Phase 1 (parallel):
  packages/@app/auth      → dist/
  packages/@app/api-client → dist/
  packages/@app/ui        → dist/

Phase 2 (depends on Phase 1):
  apps/shell              → dist/

Phase 3 (depends on Phase 1, parallel):
  apps/mfe-auth           → dist/
  apps/mfe-projects       → dist/
  apps/mfe-reports        → dist/
  apps/mfe-canva          → dist/

S3 Sync (parallel):
  shell/dist    → s3://o-daria-ui-prod/shell/
  mfe-auth/dist → s3://o-daria-ui-prod/mfe-auth/
  ...

CloudFront invalidation:
  aws cloudfront create-invalidation --paths "/*"
```

**Independent MFE deployment**: Each MFE can be deployed independently by syncing only its path. The `remoteEntry.js` is invalidated on every deploy. Other MFEs remain unaffected.

---

## Environment Variables

MFE remote URLs are injected at build time via Vite environment variables (from GitHub Actions Secrets):

| Variable                | Used In              | Example Value                                            |
| ----------------------- | -------------------- | -------------------------------------------------------- |
| `VITE_API_BASE_URL`     | `@app/api-client`    | `https://api.example.com`                                |
| `VITE_MFE_AUTH_URL`     | Shell webpack config | `https://xxx.cloudfront.net/mfe-auth/remoteEntry.js`     |
| `VITE_MFE_PROJECTS_URL` | Shell webpack config | `https://xxx.cloudfront.net/mfe-projects/remoteEntry.js` |
| `VITE_MFE_REPORTS_URL`  | Shell webpack config | `https://xxx.cloudfront.net/mfe-reports/remoteEntry.js`  |
| `VITE_MFE_CANVA_URL`    | Shell webpack config | `https://xxx.cloudfront.net/mfe-canva/remoteEntry.js`    |

---

## Rollback Strategy

Since all assets are versioned by content hash (except `remoteEntry.js` and `index.html`):

| Scenario             | Rollback Action                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Bad Shell deploy     | Re-run previous successful GitHub Actions build → re-sync → invalidate                    |
| Bad MFE deploy       | Re-run build for that MFE only → sync that path → invalidate                              |
| Bad Terraform change | `terraform plan` → `terraform apply` of previous state; or `terraform destroy` + recreate |

**No data loss risk**: Infrastructure is entirely stateless (static assets only). Rollback is a re-deploy.

---

## Terraform State Management

| Resource         | Value                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| State backend    | S3 bucket `o-daria-ui-tfstate` (separate from app bucket)                          |
| State locking    | DynamoDB table `o-daria-ui-tflock`                                                 |
| State encryption | SSE-S3 on state bucket                                                             |
| State access     | Only the Terraform executor (developer or CI) — no application code accesses state |
