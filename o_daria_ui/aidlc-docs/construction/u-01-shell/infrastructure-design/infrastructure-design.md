# Infrastructure Design — U-01: Shell & Shared Infrastructure

**Unit**: U-01  
**Date**: 2026-04-07  
**Cloud Provider**: AWS  
**IaC Tool**: Terraform  
**Environments**: Production only

---

## 1. Infrastructure Overview

The application is a static SPA served from AWS S3 via CloudFront. There is no compute infrastructure (no servers, no Lambda, no containers) — all application logic runs in the browser. The backend is an external project.

```
Browser
    |
    v
CloudFront Distribution (single)
    |
    +-- Origin: S3 Bucket (o-daria-ui-prod)
    |     +-- /shell/*         Shell host app bundle
    |     +-- /mfe-auth/*      Auth MFE bundle
    |     +-- /mfe-projects/*  Projects MFE bundle
    |     +-- /mfe-reports/*   Reports MFE bundle
    |     +-- /mfe-canva/*     Canva MFE bundle
    |
    +-- Response Headers Policy   (security headers)
    +-- Cache Behaviours          (per-path TTL config)
    |
    v
S3 Origin (private — OAC enforced)
```

---

## 2. AWS Services Map

| Service | Purpose | Configuration |
|---|---|---|
| **S3** | Static asset storage | Private bucket; public access blocked; OAC for CloudFront access only |
| **CloudFront** | CDN + HTTPS termination | Single distribution; default `*.cloudfront.net` domain; HTTPS-only redirect |
| **ACM** | SSL certificate | CloudFront default certificate (no custom domain in Phase 1) |
| **CloudFront Response Headers Policy** | HTTP security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| **GitHub Actions** | CI/CD | Build → S3 sync → CloudFront invalidation |

---

## 3. S3 Bucket Configuration

**Bucket name**: `o-daria-ui-prod`  
**Region**: `us-east-1` (CloudFront requirement for ACM certificates)

```
o-daria-ui-prod/
  shell/
    index.html          ← Shell entry point (all SPA routes)
    remoteEntry.js      ← Module Federation host manifest
    *.js / *.css        ← Shell bundle chunks
  mfe-auth/
    remoteEntry.js      ← Auth MFE manifest
    *.js / *.css
  mfe-projects/
    remoteEntry.js
    *.js / *.css
  mfe-reports/
    remoteEntry.js
    *.js / *.css
  mfe-canva/
    remoteEntry.js
    *.js / *.css
```

**Security configuration**:
- `Block all public access`: enabled
- `Bucket policy`: allows only the CloudFront Origin Access Control (OAC) principal
- `Versioning`: disabled (CI/CD overwrites; CloudFront invalidation handles cache busting)
- `Server-side encryption`: SSE-S3 (AES-256) — SECURITY-01

---

## 4. CloudFront Distribution Configuration

**Distribution settings**:

| Setting | Value |
|---|---|
| Origin | S3 bucket via OAC |
| Viewer protocol policy | Redirect HTTP to HTTPS |
| Default root object | `shell/index.html` |
| Price class | `PriceClass_100` (US, Canada, Europe — cost-effective for MVP) |
| Custom domain | None (Phase 1) — use `*.cloudfront.net` |

**Cache Behaviours**:

| Path Pattern | TTL | Notes |
|---|---|---|
| `*/remoteEntry.js` | 0 (no cache) | Must always serve latest manifest |
| `*.html` | 0 (no cache) | Shell entry point always fresh |
| `*.js`, `*.css` | 1 year | Content-hashed filenames; safe to cache long-term |
| Default (`/*`) | 0 | Fallback; serve `shell/index.html` for SPA routing |

**SPA routing**: CloudFront custom error response — 403/404 → `shell/index.html` (status 200). This enables client-side routing for all paths.

---

## 5. CloudFront Response Headers Policy (Security Headers)

**Policy name**: `o-daria-ui-security-headers`

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | See below |

**Content Security Policy**:

```
default-src 'self';
script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' ${EXTERNAL_API_DOMAIN};
img-src 'self' data:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Notes**:
- `${EXTERNAL_API_DOMAIN}` is a Terraform variable — set per environment (e.g., `https://api.example.com`)
- Google Fonts allowlisted in `style-src` and `font-src` per Infrastructure Design Q6 decision
- No `unsafe-inline` or `unsafe-eval` — SECURITY-04 compliant
- Google Fonts `<link>` tags in `index.html` **must** include SRI `integrity` hashes — SECURITY-13

---

## 6. GitHub Actions CI/CD Pipeline

**Workflow**: `.github/workflows/deploy.yml`

```
Trigger: push to main branch

Jobs:
  1. validate
     - pnpm install --frozen-lockfile
     - pnpm audit
     - pnpm turbo type-check lint test

  2. build
     - pnpm turbo build
     (outputs: apps/shell/dist, apps/mfe-*/dist)

  3. deploy  (depends on: validate, build)
     - aws s3 sync apps/shell/dist    s3://o-daria-ui-prod/shell/    --delete
     - aws s3 sync apps/mfe-auth/dist s3://o-daria-ui-prod/mfe-auth/ --delete
     - aws s3 sync apps/mfe-projects/dist s3://o-daria-ui-prod/mfe-projects/ --delete
     - aws s3 sync apps/mfe-reports/dist  s3://o-daria-ui-prod/mfe-reports/  --delete
     - aws s3 sync apps/mfe-canva/dist    s3://o-daria-ui-prod/mfe-canva/    --delete
     - aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"
```

**GitHub Actions Secrets required**:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user key (deploy role) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | `us-east-1` |
| `CF_DISTRIBUTION_ID` | CloudFront distribution ID |
| `VITE_API_BASE_URL` | External backend API base URL |
| `VITE_MFE_AUTH_URL` | Auth MFE remote entry URL |
| `VITE_MFE_PROJECTS_URL` | Projects MFE remote entry URL |
| `VITE_MFE_REPORTS_URL` | Reports MFE remote entry URL |
| `VITE_MFE_CANVA_URL` | Canva MFE remote entry URL |

---

## 7. IAM Least-Privilege Deploy Role (SECURITY-06)

The GitHub Actions deploy role has only the permissions required:

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::o-daria-ui-prod",
        "arn:aws:s3:::o-daria-ui-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DIST_ID"
    }
  ]
}
```

No wildcard actions. No wildcard resources. SECURITY-06 compliant.

---

## 8. Terraform Module Structure

```
infra/
  terraform/
    main.tf               ← Provider config, backend (S3 state)
    variables.tf          ← env vars: api_domain, mfe_*_url, etc.
    outputs.tf            ← cloudfront_domain_name, s3_bucket_name
    modules/
      s3-hosting/
        main.tf           ← S3 bucket + OAC policy
      cloudfront/
        main.tf           ← Distribution + response headers policy + error pages
      iam-deploy/
        main.tf           ← GitHub Actions deploy IAM user + policy
  terraform.tfvars.prod   ← Production variable values (no secrets — secrets in GitHub Actions)
```

**Terraform state**: Remote backend in a separate S3 bucket (`o-daria-ui-tfstate`) with DynamoDB lock table.

---

## 9. Security Compliance Summary (U-01 Infrastructure)

| Rule | Status | Evidence |
|---|---|---|
| SECURITY-01 | Compliant | HTTPS enforced via CloudFront viewer protocol policy; S3 SSE-S3 encryption at rest |
| SECURITY-02 | Deferred Phase 2 | CloudFront access logging to be enabled in Phase 2 |
| SECURITY-04 | Compliant | CloudFront Response Headers Policy sets all required headers including CSP |
| SECURITY-06 | Compliant | IAM deploy role uses specific resource ARNs and specific actions only |
| SECURITY-07 | Compliant | S3 bucket: public access blocked; CloudFront uses private origin (OAC) |
| SECURITY-09 | Compliant | No default credentials; S3 bucket has no public access; no sample apps deployed |
| SECURITY-10 | Compliant | pnpm lockfile committed; `pnpm audit` in CI pipeline; pinned GitHub Actions versions |
| SECURITY-12 | Compliant | No secrets in repo; all credentials in GitHub Actions Secrets |
| SECURITY-13 | Compliant | Google Fonts `<link>` tags require SRI `integrity` hash + `crossorigin` attribute |
