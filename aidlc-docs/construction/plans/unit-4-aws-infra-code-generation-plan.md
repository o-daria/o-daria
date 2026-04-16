# Code Generation Plan — Unit 4: AWS Infrastructure

## Unit Context
- **Unit**: Unit 4 — AWS Infrastructure (`o_daria/infra/terraform/`)
- **Workspace root**: `/Users/vi-kaivladyslav_fanh/Documents/o_daria`
- **Application code location**: `infra/terraform/` (NEVER aidlc-docs/)
- **Project type**: Brownfield — new root Terraform; migrating existing FE modules; creating new BE modules
- **Requirements covered**: FR-02, FR-04, FR-05, NFR-01, NFR-03, NFR-06
- **Blocks**: Nothing (final unit)

## Dependencies
- Requires: Unit 1 (BE app), Unit 2 (FE auth), Unit 3 (local stack verified) — all COMPLETE
- Source modules: `o_daria_ui/infra/terraform/` (FE-only, being migrated to root)

---

## Steps

### Step 1: Root Terraform files [x]
**Action**: CREATE `infra/terraform/main.tf`, `variables.tf`, `outputs.tf`, `terraform.tfvars.prod`, `user_data.sh.tpl`
**Traceability**: FR-05, MAINT-INFRA-01

### Step 2: `modules/s3-hosting/main.tf` — migrated + OAC fix [x]
**Action**: CREATE `infra/terraform/modules/s3-hosting/main.tf`
**Changes from original**: OAC resource stays here (single ownership); outputs `oac_id`; bucket renamed to `o-daria-fe-prod`
**Traceability**: SEC-INFRA-01, COST-02

### Step 3: `modules/cloudfront/main.tf` — migrated + OAC fix [x]
**Action**: CREATE `infra/terraform/modules/cloudfront/main.tf`
**Changes from original**: Removed duplicate OAC resource; new `oac_id` input variable; `default_root_object = "index.html"`; CSP updated for Google Sign-In
**Traceability**: SEC-INFRA-01, COST-02

### Step 4: `modules/iam-deploy/main.tf` — migrated [x]
**Action**: CREATE `infra/terraform/modules/iam-deploy/main.tf`
**Changes from original**: Renamed deploy user to `o-daria-prod-fe-deploy` (avoids collision with future BE deploy user)
**Traceability**: SEC-INFRA-03

### Step 5: `modules/s3-images/main.tf` — new [x]
**Action**: CREATE `infra/terraform/modules/s3-images/main.tf`
**Content**: Private S3 bucket for BE image storage; SSE; versioning; CORS for EC2 API domain
**Traceability**: SEC-INFRA-01, FR-04

### Step 6: `modules/ec2-be/main.tf` — new [x]
**Action**: CREATE `infra/terraform/modules/ec2-be/main.tf`
**Content**: t4g.nano ARM64; security group port 3300 only (no SSH); IAM instance profile (S3 images); EIP; `user_data = templatefile(...)`; `lifecycle.ignore_changes = [user_data]`
**Traceability**: COST-01, SEC-INFRA-02, SEC-INFRA-03, REL-INFRA-01

### Step 7: Update `deploy.yml` — add `GOOGLE_CLIENT_ID` [x]
**Action**: MODIFY `o_daria_ui/.github/workflows/deploy.yml`
**Change**: Added `GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}` to build job env block
**Traceability**: SEC-FE-03, FR-01

### Step 8: State + summary docs [x]
**Action**: UPDATE `aidlc-docs/aidlc-state.md`; CREATE `aidlc-docs/construction/unit-4-aws-infra/code/summary.md`; CREATE this plan file
**Traceability**: AI-DLC process requirement

---

## Acceptance Verification

- [x] `terraform init` succeeds (after bootstrap state bucket)
- [x] `terraform plan` shows no errors, creates expected resources
- [x] `terraform apply` provisions: EC2 + EIP, 2× S3 buckets, CloudFront dist, IAM deploy user + role
- [x] CloudFront domain resolves to shell SPA
- [x] EC2 port 3300 accessible; port 22 blocked
- [x] `GOOGLE_CLIENT_ID` present in CI build env → baked into webpack bundles
