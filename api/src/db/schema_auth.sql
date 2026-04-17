-- schema_auth.sql — Unit 1: Backend Authentication
-- Applied after 01_schema.sql and 02_schema_runtime.sql
-- Requires: uuid_generate_v4() extension (enabled in 01_schema.sql)
--           tenants table (defined in 01_schema.sql or 02_schema_runtime.sql)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_name_key;
ALTER TABLE tenants ADD CONSTRAINT tenants_name_key UNIQUE (name);

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_sub    TEXT        NOT NULL UNIQUE,
  email         TEXT        NOT NULL,
  name          TEXT,
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_google_sub_idx ON users (google_sub);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
