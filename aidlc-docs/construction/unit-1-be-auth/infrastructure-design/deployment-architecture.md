# Deployment Architecture — Unit 1: Backend Authentication

## Local Development (existing `docker-compose.yml`)

```
docker compose up  (o_daria_be/)
  ├── db:5432      pgvector/pgvector:pg16
  │   └── init: 01_schema.sql, 02_schema_runtime.sql, 03_schema_auth.sql  ← new
  ├── ollama:11434 ollama/ollama:latest
  └── api:3300     node:20.18.2-alpine3.20  ← version pinned
      └── env: GOOGLE_CLIENT_ID, S3_IMAGES_BUCKET, AWS_* (from .env)
```

**Migration for existing DBs** (volume already exists):
```bash
cd o_daria_be && ./scripts/migrate.sh docker
# applies schema_auth.sql to running db container
```

## Local Full-Stack (Unit 3 — `docker-compose.local.yml`)

BE service is identical; orchestrated at monorepo root with nginx proxy added.

## Production (Unit 4 — EC2 + Docker)

```
EC2 t4g.nano (arm64, Amazon Linux 2023)
  └── Docker Compose (same docker-compose.yml)
      ├── db:5432      (PostgreSQL — local to EC2, not RDS)
      ├── ollama:11434 (local embeddings)
      └── api:3300     (BE Express)
          └── IAM instance role → S3 images bucket (no AWS credentials in env)
```

**EC2 security group** (provisioned in Unit 4):
- Inbound port 22 (SSH — for deployment)
- Inbound port 3300 (API — restricted to CIDR or load balancer if added later)
- Outbound: all (HTTPS to Google OAuth API, AWS S3, Anthropic API)

## Deployment Flow (BE updates)

```
1. SSH to EC2
2. cd /app/o_daria_be
3. git pull origin main
4. docker compose build api
5. docker compose up -d api
6. (if schema change) docker compose exec api npm run docker:migrate
```

No ECR, no ECS, no GitHub Actions BE deployment at this scale — manual SSH deploy is sufficient for 1-user MVP.
