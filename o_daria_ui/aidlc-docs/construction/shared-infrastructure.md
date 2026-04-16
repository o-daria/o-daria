# Shared Infrastructure
# Marketing Audience Analysis Platform (o_daria_ui)

**Date**: 2026-04-07  
**Scope**: Infrastructure shared across all units (U-01 through U-05)

---

## Shared AWS Resources

| Resource | Name | Shared By | Notes |
|---|---|---|---|
| S3 Bucket (app) | `o-daria-ui-prod` | All units | Each unit syncs to its own path prefix |
| CloudFront Distribution | Single distribution | All units | Single `*.cloudfront.net` domain |
| IAM Deploy Role | `o-daria-ui-deploy` | GitHub Actions | Used by all unit deploys |
| Response Headers Policy | `o-daria-ui-security-headers` | All units | Applies to all CloudFront responses |
| S3 Bucket (tfstate) | `o-daria-ui-tfstate` | Terraform | Remote state backend |
| DynamoDB Table | `o-daria-ui-tflock` | Terraform | State locking |

---

## S3 Path Ownership

| Path | Unit | Description |
|---|---|---|
| `s3://o-daria-ui-prod/shell/` | U-01 | Shell host app |
| `s3://o-daria-ui-prod/mfe-auth/` | U-02 | Auth MFE |
| `s3://o-daria-ui-prod/mfe-projects/` | U-03 | Projects MFE |
| `s3://o-daria-ui-prod/mfe-reports/` | U-04 | Reports MFE |
| `s3://o-daria-ui-prod/mfe-canva/` | U-05 | Canva MFE |

---

## Shared Terraform Modules

All units reuse these Terraform modules from `infra/terraform/modules/`:

| Module | Used by |
|---|---|
| `s3-hosting` | U-01 (creates the shared bucket) |
| `cloudfront` | U-01 (creates the shared distribution) |
| `iam-deploy` | U-01 (creates the shared deploy role) |

Units U-02 through U-05 add only their own GitHub Actions deploy steps — they do not provision new infrastructure resources. The shared infrastructure created by U-01 Terraform serves all units.

---

## GitHub Actions Shared Secrets

These secrets are set once at the repository level and used by all unit deploy workflows:

| Secret | Used By |
|---|---|
| `AWS_ACCESS_KEY_ID` | All unit deploys |
| `AWS_SECRET_ACCESS_KEY` | All unit deploys |
| `AWS_REGION` | All unit deploys |
| `CF_DISTRIBUTION_ID` | All unit deploys (invalidation) |
| `VITE_API_BASE_URL` | U-04 (reports), U-05 (canva) |
| `VITE_MFE_*_URL` | U-01 Shell (Module Federation config) |
