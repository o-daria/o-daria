# Code Summary — Unit 4: AWS Infrastructure

## Unit Context

- **Unit**: Unit 4 — AWS Infrastructure (`o_daria/infra/terraform/`)
- **Requirements covered**: FR-02, FR-04, FR-05, NFR-01, NFR-03, NFR-06
- **All 8 steps executed successfully**

---

## Created Files

| File                                         | Description                                                                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/terraform/main.tf`                    | Root Terraform entry point. Wires all 5 modules: s3-hosting, cloudfront, iam-deploy, s3-images, ec2-be. State backend: `o-daria-tfstate` S3 + DynamoDB lock                                                    |
| `infra/terraform/variables.tf`               | All input variables: `aws_region`, `app_name`, `environment`, `anthropic_api_key` (sensitive), `google_client_id` (sensitive), `api_key` (sensitive)                                                           |
| `infra/terraform/outputs.tf`                 | Key outputs: CloudFront domain, FE S3 bucket name, CF distribution ID, IAM deploy user, EC2 public IP + DNS, images S3 bucket name                                                                             |
| `infra/terraform/terraform.tfvars.prod`      | Non-secret prod values. Secrets set via `TF_VAR_*` env vars in CI                                                                                                                                              |
| `infra/terraform/user_data.sh.tpl`           | EC2 bootstrap template: installs Docker + Compose plugin, writes `.env` + `docker-compose.yml`, pulls and starts services, registers systemd unit for auto-restart                                             |
| `infra/terraform/modules/s3-hosting/main.tf` | FE S3 bucket (migrated from `ui/`). OAC resource moved here (single ownership). Bucket policy uses `cloudfront_distribution_arn` input                                                                         |
| `infra/terraform/modules/cloudfront/main.tf` | CloudFront distribution (migrated). Removed duplicate OAC resource — now consumes `oac_id` input from s3-hosting. `default_root_object = "index.html"`. CSP updated for Google Sign-In (`accounts.google.com`) |
| `infra/terraform/modules/iam-deploy/main.tf` | FE deploy IAM user (migrated). Least-privilege: S3 sync + CF invalidation only                                                                                                                                 |
| `infra/terraform/modules/s3-images/main.tf`  | New S3 bucket for BE image storage. Private, SSE, versioned, CORS for EC2 API domain                                                                                                                           |
| `infra/terraform/modules/ec2-be/main.tf`     | EC2 t4g.nano (ARM64). Security group: port 3300 only (no SSH). IAM instance profile with S3 images read/write. EIP for stable address. 20 GB gp3 encrypted root volume                                         |

## Modified Files

| File                              | Change                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ui/.github/workflows/deploy.yml` | Added `GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}` to build env — bakes client ID into webpack bundles at CI build time |

---

## Architecture Decisions

| Decision                                 | Choice                                    | Reason                                                                           |
| ---------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| EC2 type                                 | t4g.nano (ARM64)                          | ~$3/month; sufficient for 1 user + Docker stack                                  |
| SSH access                               | None (security group has no port 22)      | SEC-INFRA-02; use SSM Session Manager for shell access if needed                 |
| OAC ownership                            | Moved from cloudfront → s3-hosting module | Single source of truth; avoids circular dependency + duplicate resource          |
| Secrets in user_data                     | `templatefile()` with sensitive vars      | Avoids plaintext in tfstate — user_data hash stored, not content                 |
| `lifecycle.ignore_changes = [user_data]` | Enabled                                   | Prevents instance replacement on secrets rotation; use `taint` to force re-apply |
| State backend                            | New `o-daria-tfstate` bucket              | Separate from FE-only `o-daria-ui-tfstate`; covers full monorepo stack           |
| BE Docker image pull                     | `ghcr.io/${app_name}/o-daria-be:latest`   | Requires a separate CI pipeline to build + push BE image to GHCR                 |

---

## Post-Apply Steps (manual)

1. **Bootstrap state backend** (once, before `terraform init`):
   ```bash
   aws s3api create-bucket --bucket o-daria-tfstate --region us-east-1
   aws s3api put-bucket-versioning --bucket o-daria-tfstate \
     --versioning-configuration Status=Enabled
   aws dynamodb create-table --table-name o-daria-tflock \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST --region us-east-1
   ```
2. **Create access keys** for the IAM deploy user (output: `deploy_user_name`), add to GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. **Add GitHub Actions secrets**: `GOOGLE_CLIENT_ID`, `VITE_API_BASE_URL` (= `https://<ec2_public_dns>`), `VITE_MFE_*_URL` (= `https://<cloudfront_domain>/mfe-*/remoteEntry.js`), `S3_BUCKET`, `CF_DISTRIBUTION_ID`
4. **Build + push BE Docker image** to `ghcr.io/<org>/o-daria-be:latest` — user_data pulls this on first boot
5. **Update Google Cloud Console** — add EC2 public DNS + CloudFront domain as authorized JavaScript origins

---

## NFR Compliance

| Rule                                    | Status    | Note                                                          |
| --------------------------------------- | --------- | ------------------------------------------------------------- |
| SEC-INFRA-01 (S3 public access blocked) | Compliant | Both FE + images buckets have full public access block        |
| SEC-INFRA-02 (no EC2 SSH)               | Compliant | Security group has no port 22; use SSM if shell access needed |
| SEC-INFRA-03 (least-privilege IAM)      | Compliant | Deploy user: S3+CF only. EC2 instance profile: S3 images only |
| COST-01 (t4g.nano)                      | Compliant | ARM64 t4g.nano selected                                       |
| COST-02 (single CF dist + S3 bucket)    | Compliant | One distribution, one FE bucket                               |
| REL-INFRA-01 (Docker restart always)    | Compliant | `restart: always` in user_data docker-compose + systemd unit  |
| MAINT-INFRA-01 (unified Terraform root) | Compliant | All modules under `infra/terraform/` at monorepo root         |
