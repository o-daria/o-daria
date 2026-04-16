#!/bin/bash
# EC2 bootstrap script (Amazon Linux 2023, ARM64 / t4g.nano)
# Rendered by Terraform templatefile() — placeholders are replaced at apply time.
set -euo pipefail

# ── Install Docker ─────────────────────────────────────────────────────────────
dnf update -y
dnf install -y docker
systemctl enable docker
systemctl start docker

# Add ec2-user to docker group so we can run docker commands without sudo
usermod -aG docker ec2-user

# ── Install Docker Compose plugin ─────────────────────────────────────────────
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ── Write BE environment file ──────────────────────────────────────────────────
mkdir -p /opt/o-daria
cat > /opt/o-daria/.env <<'ENVEOF'
ANTHROPIC_API_KEY=${anthropic_api_key}
GOOGLE_CLIENT_ID=${google_client_id}
API_KEY=${api_key}
FRONTEND_URL=${frontend_url}
S3_IMAGES_BUCKET=${s3_images_bucket}
AWS_REGION=${aws_region}
EMBEDDING_PROVIDER=ollama
EMBEDDING_BASE_URL=http://ollama:11434/v1
PORT=3300
ENVEOF

# ── Write docker-compose.yml ───────────────────────────────────────────────────
cat > /opt/o-daria/docker-compose.yml <<'COMPOSEEOF'
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: audience_intelligence
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d audience_intelligence"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: always

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    entrypoint:
      ["/bin/sh", "-c", "ollama serve & sleep 3 && ollama pull nomic-embed-text && wait"]
    healthcheck:
      test: ["CMD-SHELL", "ollama list | grep -q nomic-embed-text"]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 60s
    restart: always

  api:
    image: ghcr.io/${app_name}/o-daria-be:latest
    env_file: /opt/o-daria/.env
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/audience_intelligence
      EMBEDDING_BASE_URL: http://ollama:11434/v1
    ports:
      - "3300:3300"
    depends_on:
      db:
        condition: service_healthy
      ollama:
        condition: service_healthy
    restart: always

volumes:
  pg_data:
  ollama_data:
COMPOSEEOF

# ── Pull and start services ────────────────────────────────────────────────────
cd /opt/o-daria
docker compose pull
docker compose up -d

# ── Enable on reboot ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/o-daria.service <<'SVCEOF'
[Unit]
Description=o-daria BE stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/o-daria
ExecStart=/usr/local/lib/docker/cli-plugins/docker-compose up -d
ExecStop=/usr/local/lib/docker/cli-plugins/docker-compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl enable o-daria.service
