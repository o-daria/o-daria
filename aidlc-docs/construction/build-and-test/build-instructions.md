# Build Instructions — All Units

## Prerequisites

| Tool                  | Version  | Notes                                   |
| --------------------- | -------- | --------------------------------------- |
| Node.js               | 20.x     | Required by both BE and FE              |
| pnpm                  | 10.33.0  | FE workspace manager                    |
| Docker                | 24+      | Local stack + BE container build        |
| Docker Compose plugin | v2       | `docker compose` (not `docker-compose`) |
| Terraform             | >= 1.9.0 | Unit 4 only                             |
| AWS CLI               | v2       | Unit 4 only                             |

---

## Unit 1 — Backend Authentication

### Local (without Docker)

```bash
cd api

# Install dependencies (includes google-auth-library added in Unit 1)
npm ci

# Apply DB schema (requires PostgreSQL running with DATABASE_URL set)
npm run migrate

# Verify the app starts
node src/app.js
# Expect: "Server listening on port 3300" (no startup errors)
```

### With Docker (recommended)

```bash
cd api

# Build the BE Docker image
docker build -t o-daria-be:local .

# Start full BE stack (db + ollama + api)
docker compose up --build

# Verify health
curl http://localhost:3300/health
# Expected: {"status":"ok"}
```

**What to verify:**

- `POST /auth/google` route is registered (check startup logs, no route errors)
- `GET /health` returns 200
- DB schema includes `users` and `sessions` tables:
  ```bash
  docker compose exec db psql -U postgres -d audience_intelligence \
    -c "\dt" | grep -E "users|sessions"
  ```

---

## Unit 2 — Frontend Authentication

### Type-check + build

```bash
cd ui

# Install all workspace dependencies
pnpm install --frozen-lockfile

# Type-check all packages and apps
pnpm type-check
# Expected: 0 errors

# Build all apps (requires GOOGLE_CLIENT_ID set — can be empty string for build verification)
GOOGLE_CLIENT_ID=placeholder pnpm build
# Expected: dist/ created for shell, mfe-auth, mfe-projects, mfe-reports, mfe-canva
```

**What to verify:**

- No TypeScript errors in `@app/auth` package (new types + deprecated annotations)
- `apps/shell/dist/` contains `index.html` and JS chunks
- `apps/mfe-auth/dist/` contains `remoteEntry.js`
- `apps/mfe-*/dist/` all contain `remoteEntry.js`

---

## Unit 3 — Local Full-Stack Stack

```bash
# From monorepo root
cp .env.local.example .env.local
# Edit .env.local — fill in:
#   GOOGLE_CLIENT_ID=<your Google OAuth client ID>
#   ANTHROPIC_API_KEY=sk-ant-...

# Build and start full stack
docker compose -f docker-compose.local.yml up --build

# Wait for all 4 services to be healthy (2-3 min on first run — ollama pulls nomic-embed-text)
# Monitor: docker compose -f docker-compose.local.yml logs -f
```

**What to verify:**

- `http://localhost:8080` → shell SPA loads
- `http://localhost:8080/auth/login` → Google Sign-In button visible (no email/password form)
- `http://localhost:8080/api/health` → `{"status":"ok"}` (nginx proxy working)
- `http://localhost:8080/mfe-auth/remoteEntry.js` → JS content (MFE routing working)

```bash
# Verify nginx proxy strips /api prefix correctly
curl http://localhost:8080/api/health
# Expected: {"status":"ok"}

# Verify DB schema applied (users + sessions tables exist)
docker compose -f docker-compose.local.yml exec db \
  psql -U postgres -d audience_intelligence -c "\dt" | grep -E "users|sessions"
```

---

## Unit 4 — AWS Infrastructure

### Step A: Bootstrap state backend (once only)

```bash
# Run from anywhere with AWS credentials configured
aws s3api create-bucket \
  --bucket o-daria-tfstate \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket o-daria-tfstate \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket o-daria-tfstate \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### Step B: Push BE Docker image (before EC2 bootstrap)

The EC2 `user_data` script pulls `ghcr.io/o-daria/o-daria-be:latest`.
You must push the BE image to GHCR before running `terraform apply`:

```bash
cd api

# Authenticate to GHCR (requires GitHub PAT with packages:write scope)
echo $GITHUB_TOKEN | docker login ghcr.io -u <github-username> --password-stdin

# Build for linux/arm64 (EC2 t4g.nano is ARM)
docker buildx build \
  --platform linux/arm64 \
  --tag ghcr.io/<github-org>/o-daria-be:latest \
  --push \
  .
```

### Step C: Terraform apply

```bash
cd infra/terraform

terraform init -backend-config="region=us-east-1"

# Export secrets as Terraform vars (never commit these)
export TF_VAR_anthropic_api_key="sk-ant-..."
export TF_VAR_google_client_id="<client-id>.apps.googleusercontent.com"
export TF_VAR_api_key="your-api-key"

terraform plan -var-file=terraform.tfvars.prod
# Review: should show ~15 resources to create

terraform apply -var-file=terraform.tfvars.prod
```

**Note on circular dependency (s3-hosting ↔ cloudfront):**
The S3 bucket policy requires the CloudFront ARN, but CloudFront is created after S3. Terraform resolves this in a single apply pass using `depends_on` implicit references. If `apply` fails on the bucket policy, run `terraform apply` a second time — this is a known Terraform limitation with OAC bucket policies.

### Step D: Post-apply configuration

After `terraform apply` completes, retrieve outputs:

```bash
terraform output
```

Use outputs to:

1. **Create IAM access keys** for the deploy user:
   ```bash
   aws iam create-access-key --user-name $(terraform output -raw deploy_user_name)
   ```
2. **Add GitHub Actions secrets** in `ui` repo settings:
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — from above
   - `AWS_REGION` = `us-east-1`
   - `S3_BUCKET` = `terraform output -raw s3_fe_bucket_name`
   - `CF_DISTRIBUTION_ID` = `terraform output -raw cloudfront_distribution_id`
   - `GOOGLE_CLIENT_ID` = your Google OAuth client ID
   - `VITE_API_BASE_URL` = `https://$(terraform output -raw ec2_public_dns)`
   - `VITE_MFE_AUTH_URL` = `https://$(terraform output -raw cloudfront_domain_name)/mfe-auth/remoteEntry.js`
   - `VITE_MFE_PROJECTS_URL` = `https://$(terraform output -raw cloudfront_domain_name)/mfe-projects/remoteEntry.js`
   - `VITE_MFE_REPORTS_URL` = `https://$(terraform output -raw cloudfront_domain_name)/mfe-reports/remoteEntry.js`
   - `VITE_MFE_CANVA_URL` = `https://$(terraform output -raw cloudfront_domain_name)/mfe-canva/remoteEntry.js`
3. **Update Google Cloud Console** — add EC2 DNS + CloudFront domain as authorized JavaScript origins
4. **Trigger FE deploy** — push to `main` branch of `ui`
