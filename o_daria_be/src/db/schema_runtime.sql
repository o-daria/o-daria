-- ═══════════════════════════════════════════════════════════════════
-- schema_runtime.sql — Tables used by the current runtime code
--
-- schema.sql defines the planned schema (projects / job_events).
-- The current codebase uses reports / job_audit instead.
-- Both files are applied on first boot via Docker init order.
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Reports ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       TEXT NOT NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name    TEXT NOT NULL,
  brand_dna       JSONB NOT NULL DEFAULT '{}',
  brand           TEXT NOT NULL DEFAULT '',
  brand_raw_input TEXT NOT NULL,
  handles         TEXT[] NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending | running | done | failed
  error           TEXT,
  report_json     JSONB,
  integrity       JSONB,
  canva_url       TEXT,                    -- Canva presentation URL (set after approval)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reports_tenant_idx  ON reports (tenant_id);
CREATE INDEX IF NOT EXISTS reports_status_idx  ON reports (status);
CREATE INDEX IF NOT EXISTS reports_project_idx ON reports (project_id);

-- Idempotent migration for existing DBs (Docker init only runs on fresh volumes)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
-- handle_map stores { hash → plaintext } for presentation asset lookup.
-- Kept separate from report_json (which is pseudonymized) so Canva upload
-- can resolve hashed handles back to the profiles/ directory names.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS handle_map JSONB;

-- Dev tenant seed (matches app.js default when TENANT_ID is not set)
INSERT INTO tenants (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000000', 'dev', 'starter')
ON CONFLICT (id) DO NOTHING;

-- ─── Job audit log ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_audit (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  job_name    TEXT NOT NULL,    -- fetch | analyze | aggregate | validate
  status      TEXT NOT NULL,   -- started | completed | failed
  input_hash  TEXT,
  output_hash TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  error       TEXT
);

CREATE INDEX IF NOT EXISTS job_audit_report_idx ON job_audit (report_id, started_at ASC);

-- ─── Pipeline checkpoints (resume after failure) ─────────────────
-- Stores intermediate state after each successful pipeline step
-- so that a failed pipeline can resume without re-running expensive
-- batch API calls.

CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
  report_id       UUID PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
  last_step       TEXT NOT NULL,          -- 'brand_dna' | 'fetch' | 'analyze' | 'aggregate'
  state           JSONB NOT NULL,         -- serialized intermediate pipeline state
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Canva presentations ──────���──────────────────────────────────────

CREATE TABLE IF NOT EXISTS presentation_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id             UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  tenant_id             TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  -- pending | uploading_assets | building_query | ready | approved | failed
  asset_map             JSONB,
  query_text            TEXT,
  manifest              JSONB,              -- { asset_ids: [...], total_slides: N }
  candidates            JSONB,              -- [{ candidate_id, thumbnail_url }]
  job_id                TEXT,               -- Canva generate-design job ID
  approved_candidate_id TEXT,
  canva_design_url      TEXT,
  error                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pres_req_report_idx ON presentation_requests (report_id);
