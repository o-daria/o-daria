# Infrastructure Design — Unit 1: Backend Authentication

## Runtime Environment

| Environment      | Stack                                     | Notes                                 |
| ---------------- | ----------------------------------------- | ------------------------------------- |
| Local dev        | Docker Compose (`api/docker-compose.yml`) | PostgreSQL + Ollama + API containers  |
| Local full-stack | `docker-compose.local.yml` (Unit 3)       | Same BE image; nginx fronts it        |
| Production       | EC2 t4g.nano + Docker (Unit 4 Terraform)  | Same `docker-compose.yml`; no ECS/ECR |

## BE Service (api container)

- **Base image**: `node:20.18.2-alpine3.20` (pinned — NFR-06 / SEC-10)
- **Port**: `3300` (internal); exposed via nginx proxy in local stack; direct on EC2 with security group
- **Startup**: `node src/app.js` — fail-fast if `GOOGLE_CLIENT_ID` or `S3_IMAGES_BUCKET` absent

## Database (db container)

- **Image**: `pgvector/pgvector:pg16` (existing — no change)
- **Init order**:
  1. `01_schema.sql`
  2. `02_schema_runtime.sql`
  3. `03_schema_auth.sql` ← new mount added to `docker-compose.yml`
- **migrate.sh**: Updated to apply `schema_auth.sql` as third file (for existing DBs)

## AWS S3 — Images Bucket

- **Bucket name**: from `process.env.S3_IMAGES_BUCKET`
- **Access**: AWS SDK default credential chain
  - Local dev: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` in `.env`
  - Production (EC2): IAM instance role (no credentials in env — more secure)
- **Operations**: `PutObjectCommand` only (write-only from BE at this release)
- **Provisioned by**: Unit 4 Terraform (`modules/s3-images/`)

## New Environment Variables

| Variable                | Required In            | Purpose                                                  |
| ----------------------- | ---------------------- | -------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | BE `.env` / EC2 env    | Google OAuth2 client ID for token verification           |
| `FRONTEND_URL`          | BE `.env` / EC2 env    | Added to CORS `allowedOrigins` (e.g. CloudFront domain)  |
| `S3_IMAGES_BUCKET`      | BE `.env` / EC2 env    | S3 bucket name for profile images                        |
| `AWS_REGION`            | BE `.env` (local only) | AWS region for S3 client                                 |
| `AWS_ACCESS_KEY_ID`     | BE `.env` (local only) | AWS credentials (local dev only; EC2 uses instance role) |
| `AWS_SECRET_ACCESS_KEY` | BE `.env` (local only) | AWS credentials (local dev only)                         |
