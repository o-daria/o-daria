-- ═══════════════════════════════════════════════════════════════════
-- schema.sql  — Audience Intelligence Platform
-- Requires: PostgreSQL 15+, pgvector extension
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tenants ──────────────────────────────────────────────────────

CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'starter',  -- starter | pro | agency
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings    JSONB NOT NULL DEFAULT '{}'
);

-- ─── Prompt versions (immutable, append-only) ─────────────────────
-- Every deployed prompt is versioned. Reports store which version
-- was used so they can be reproduced exactly.

CREATE TABLE prompt_versions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,       -- 'analysis_system' | 'aggregation_user' | ...
  version     TEXT NOT NULL,       -- semver '2.1.0'
  body        TEXT NOT NULL,
  model_hint  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, version)
);

-- ─── Profile analysis cache (shared across tenants) ───────────────
-- handle-scoped; tenant isolation applies at aggregation level, not here.

CREATE TABLE profile_analyses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle         TEXT NOT NULL,
  analysis       JSONB NOT NULL,
  embedding      vector(768),       -- of observed_signals + topics combined
  profile_hash   TEXT NOT NULL,      -- lightweight staleness signal
  analyzed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '45 days',
  prompt_version TEXT NOT NULL,
  model_used     TEXT NOT NULL
);

CREATE UNIQUE INDEX profile_analyses_handle_idx ON profile_analyses (handle);
CREATE INDEX profile_analyses_embedding_idx ON profile_analyses
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX profile_analyses_expires_idx ON profile_analyses (expires_at);

-- ─── Segment library (cross-client learning) ──────────────────────
-- Stored with tenant_id ownership.
-- Retrieval MUST filter OUT the requesting tenant's brand_id
-- to prevent competitive intelligence leakage.

CREATE TABLE segment_library (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand         TEXT NOT NULL,
  segment_name  TEXT NOT NULL,
  segment_data  JSONB NOT NULL,
  embedding     vector(768),        -- of name + defining_traits + content_direction
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX segment_library_embedding_idx ON segment_library
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX segment_library_tenant_idx ON segment_library (tenant_id);

-- ─── Brand archetypes (platform-curated reference corpus) ─────────

CREATE TABLE brand_archetypes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  parameters  JSONB NOT NULL,   -- { tone, visual_vocabulary[], value_tensions[], anti_values[] }
  embedding   vector(768)
);

CREATE INDEX brand_archetypes_embedding_idx ON brand_archetypes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ─── Projects ─────────────────────────────────────────────────────

CREATE TABLE projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        TEXT NOT NULL,
  brand_name       TEXT NOT NULL,
  brand_dna_raw    TEXT NOT NULL,
  brand_dna        JSONB,
  handles          TEXT[],
  status           TEXT NOT NULL DEFAULT 'pending',
  -- pending | fetching | analyzing | aggregating | building | done | failed
  report           JSONB,
  report_integrity JSONB,
  canva_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  prompt_versions  JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX projects_tenant_idx ON projects (tenant_id);
CREATE INDEX projects_status_idx ON projects (status);

-- ─── Job audit log ─────────────────────────────────────────────────

CREATE TABLE job_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,   -- fetch|analyze|aggregate|validate|build
  event       TEXT NOT NULL,   -- started|completed|failed|retried|gate_blocked
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX job_events_project_idx ON job_events (project_id, created_at DESC);

-- ─── Maintenance ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION purge_expired_analyses() RETURNS void AS $$
  DELETE FROM profile_analyses WHERE expires_at < NOW();
$$ LANGUAGE sql;