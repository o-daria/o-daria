#!/usr/bin/env sh
# Apply schema changes to an existing database.
#
# Usage:
#   ./scripts/migrate.sh                  # uses DATABASE_URL from environment
#   ./scripts/migrate.sh docker           # targets the running Docker db container
#
# The Docker variant runs psql inside the db container, so it works even when
# the host has no psql installed and the port is not exposed.
#
# Both schema files are applied in order (same order as docker-entrypoint-initdb.d/).
# All statements use CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS so
# running this against an already-migrated DB is safe (idempotent).

set -euo pipefail

SCHEMA="src/db/schema.sql"
SCHEMA_RUNTIME="src/db/schema_runtime.sql"
SCHEMA_AUTH="src/db/schema_auth.sql"

apply_docker() {
  local container
  container=$(docker compose ps -q db 2>/dev/null || true)
  if [ -z "$container" ]; then
    echo "Error: 'db' service is not running. Start it with:" >&2
    echo "  docker compose up -d db" >&2
    exit 1
  fi

  echo "Applying $SCHEMA to Docker db container..."
  docker compose exec -T db psql -U postgres -d audience_intelligence < "$SCHEMA"

  echo "Applying $SCHEMA_RUNTIME to Docker db container..."
  docker compose exec -T db psql -U postgres -d audience_intelligence < "$SCHEMA_RUNTIME"

  echo "Applying $SCHEMA_AUTH to Docker db container..."
  docker compose exec -T db psql -U postgres -d audience_intelligence < "$SCHEMA_AUTH"

  echo "Migration complete."
}

apply_env() {
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "Error: DATABASE_URL is not set." >&2
    exit 1
  fi

  echo "Applying $SCHEMA to \$DATABASE_URL..."
  psql "$DATABASE_URL" -f "$SCHEMA"

  echo "Applying $SCHEMA_RUNTIME to \$DATABASE_URL..."
  psql "$DATABASE_URL" -f "$SCHEMA_RUNTIME"

  echo "Applying $SCHEMA_AUTH to \$DATABASE_URL..."
  psql "$DATABASE_URL" -f "$SCHEMA_AUTH"

  echo "Migration complete."
}

case "${1:-}" in
  docker) apply_docker ;;
  "")     apply_env ;;
  *)
    echo "Usage: $0 [docker]" >&2
    exit 1
    ;;
esac
