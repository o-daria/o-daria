# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Audience Intelligence — a multi-tenant SaaS API that analyzes Instagram audiences for marketing teams. Takes a brand description + list of Instagram handles, scrapes profiles via Apify, runs AI analysis (Claude Sonnet for per-profile, Haiku for aggregation/validation), and produces audience reports with segments, alignment scores, and content pillars.

## Commands

```bash
npm run dev              # Start API with --watch (auto-restart)
npm start                # Start API (production)
npm test                 # Run all tests (vitest run)
npm run test:watch       # Run tests in watch mode (vitest)
npm run migrate          # Apply schema to PostgreSQL ($DATABASE_URL)
npm run docker:migrate   # Apply schema to the running Docker db container (no psql needed on host)
npm run seed-prompts     # Register current prompt versions in DB
npm run local            # Local pipeline runner (no DB/Apify) — see below
npm run prepare-canva    # Build Canva query from audience_report.json + asset_map.json
```

Requires PostgreSQL 15+ with pgvector extension. See `Architecture.md` → "Running Locally" for full setup including Docker pgvector.

### Applying schema changes to an existing Docker database

`docker-entrypoint-initdb.d/` only runs on a **fresh volume** — it is skipped when `pg_data` already exists. To apply new tables or indexes to a running container:

```bash
# Docker stack must be running (at least the db service)
npm run docker:migrate

# Or directly if you have psql on the host and DATABASE_URL set:
npm run migrate
```

Both commands apply `schema.sql` then `schema_runtime.sql` in order. All DDL uses
`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so re-running is safe.

## Architecture

Five layers, each in its own directory:
src/db/ PostgreSQL + pgvector (schema.sql, client.js)
src/pipeline/ Orchestrator + 5 jobs (fetch→analyze→aggregate→validate→audit)
src/rag/ Embeddings, profile cache, segment library, brand DNA compiler
src/prompts/ DB-versioned prompt registry + 4 templates
src/safety/ Input sanitization, PII handler, output signer

**Entry point:** `src/app.js` — Express API. Thin HTTP layer, all logic delegated to orchestrator.

**Pipeline flow** (deterministic, not dynamic routing):

1. `inputSanitizer.validateHandle()` — reject malformed handles
2. `brandDnaCompiler.compileBrandDna()` — free text → structured brand DNA (Haiku)
3. `fetchJob.fetchProfiles()` — Apify scrape, parallel, 5 concurrent
4. `analyzeJob.runAnalyzeJob()` — per-profile analysis (Sonnet Batch API), with profile cache + RAG few-shot calibration
5. `aggregateJob.runAggregateJob()` — report synthesis (Haiku), with segment library RAG calibration
6. `validateJob.runValidation()` — semantic QA gate after steps 4 and 5; on `ValidationError`, orchestrator retries once with clarification notes injected

**Async model:** POST /reports returns immediately with `report_id`; pipeline runs in background; client polls GET /reports/:id.

## Three RAG Systems (pgvector)

1. **Profile cache** (`profile_analyses` table) — cache hit skips Sonnet entirely. 45-day TTL. Handle stored as sha256.
2. **Profile similarity** — same table, different query. k=2 nearest neighbors injected as few-shot calibration examples.
3. **Segment library** (`segment_library` table) — cross-client learning. Reads filter `tenant_id != requesting_tenant`. Append-only by design.

All embeddings: Ollama `nomic-embed-text` (768 dimensions) by default, or OpenAI `text-embedding-3-small` (1536 dimensions) if `EMBEDDING_PROVIDER=openai`. Changing the model requires updating the `vector()` column size in `schema.sql` to match.

## Safety Rules

- `src/safety/` is the security boundary. Changes here affect all tenants.
- Never remove from `INJECTION_PATTERNS` in `inputSanitizer.js` — only add.
- `segmentLibrary.js` is append-only — only INSERTs and SELECTs, no DELETE/UPDATE.
- Captions from Instagram are wrapped in `<caption is_user_data="true">` tags for injection defense.
- Reports are signed with sha256 checksums (`outputSigner.js`); GET endpoint verifies before returning.

## Prompt Versioning

Prompts are stored in `prompt_versions` DB table (immutable, append-only). Reports snapshot which versions were used in `integrity.prompt_versions`. Templates live in `src/prompts/templates/`. To A/B test: insert new version in DB, pass `{ prompt_versions: { analysis: 'v2.1' } }` in POST body.

## Environment Variables

`DATABASE_URL`, `ANTHROPIC_API_KEY`, `EMBEDDING_PROVIDER` (ollama|openai, default ollama), `OPENAI_API_KEY` (only if openai provider), `APIFY_TOKEN`, `API_KEY` (bearer auth), `TENANT_ID` (dev only), `PORT` (default 3300).

## Testing

Tests use **Vitest** (`vitest.config.js` at root). Config: `vitest.config.js`.

```bash
npm test                 # Run all tests once (vitest run)
npm run test:watch       # Watch mode (vitest)
npx vitest run src/safety/  # Run tests in a specific directory
```

**Test structure** (bottom-heavy pyramid):

- **Unit tests** (`src/**/*.test.js`): Pure functions, no mocks. `inputSanitizer`, `outputSigner`, `piiHandler`, `embeddings`, `registry`.
- **Integration tests** (`src/**/*.test.js`): Use `vi.mock()` for DB/LLM. `segmentLibrary`, `profileCache`, `orchestrator`, `validateJob`, `app`.
- **Smoke test** (`test/pipeline.smoke.test.js`): Full pipeline with mocked LLM + real test DB. Requires `DATABASE_URL_TEST`.

**Writing tests:**

- Import from `vitest`: `import { describe, it, expect, vi } from 'vitest'`
- Use `vi.mock('./module.js', () => ({ ... }))` for module mocking (hoisted automatically)
- Use `expect(x).toBe(y)` / `expect(x).toThrow()` / `expect(promise).rejects.toThrow()` etc.
- Use `beforeEach` / `beforeAll` / `afterAll` from vitest for lifecycle hooks
- After `vi.mock()`, import the module under test with `await import('./module.js')`

## Key Constraints

- Node.js ESM (`"type": "module"`) — use `import`, not `require`
- Clarification messages in orchestrator are in Ukrainian
- The DB has two parallel schemas: `reports`/`job_audit` (used by current code) and `projects`/`job_events` (in schema.sql) — be aware of this discrepancy

## Critical invariants — never violate these

**Tenant isolation**: `segmentLibrary.findSimilarSegments()` always filters
`WHERE tenant_id != requesting_tenant`. Never remove this filter.

**Prompt injection defense**: All Instagram caption text must flow through
`sanitizeCaption()` before reaching any LLM call. Never inline raw caption
strings directly into prompt content.

**Brand DNA compilation**: `brand_raw_input` (free text) must be compiled
via `compileBrandDna()` before being passed to analysis or aggregation prompts.
Never pass raw text directly to those prompts.

**Handle pseudonymization**: Plaintext handles are only stored in
tenant-scoped report context. The shared `profile_analyses` cache stores
`handle_hash` only. Use `pseudonymizeAnalysis()` before any cache write.

**Report signing**: Every completed report must be signed via `signReport()`
before DB persistence. `GET /reports/:id` verifies the checksum on read.

## Prompt versioning

Prompts live in the DB (`prompt_versions` table), not just in template files.
After editing any file in `src/prompts/templates/`, run `npm run seed-prompts`
to register the new version. Bump the version string in registry.js.
Never modify a prompt template without bumping its version.

## RAG write paths

Two tables accumulate data over time — be careful with writes:

- `profile_analyses`: written by `profileCache.setCachedAnalysis()` only
- `segment_library`: written by `segmentLibrary.indexReportSegments()` only
  (called once per completed report, non-fatal if it fails)

## ValidationError flow

`validateJob.runValidation()` throws `ValidationError` on critical issues.
The orchestrator catches this and runs one clarification retry via
`withClarificationRetry()`. If the retry also fails, the error propagates
and the report status is set to 'failed'. Do not swallow ValidationErrors.

## Injection-flagged captions

`injection_flagged="true"` on a caption block is NOT a pipeline error.
It means the caption contained suspicious patterns and was logged.
Analysis continues normally. Never skip or abort analysis on flagged captions.

## .claude/rules/ (path-scoped rules)

Scoped rule files are in `.claude/rules/` and auto-loaded when editing matching paths:

- `.claude/rules/safety.md` — paths: `src/safety/**`
- `.claude/rules/rag.md` — paths: `src/rag/**`
- `.claude/rules/pipeline.md` — paths: `src/pipeline/**`
- `.claude/rules/prompts.md` — paths: `src/prompts/**`

---

## Local Pipeline Runner

Use when you have pre-scraped profiles in `profiles/{handle}/` and want to run analysis + aggregation without PostgreSQL, Apify, or pgvector.

```bash
# Analyze specific handles and aggregate a report
BRAND_NAME="Висота 890" BRAND_VALUES="stillness, quality without pretension" \
  node scripts/run-local.js --handles handle1,handle2,handle3

# Analyze everything in profiles/ directory
node scripts/run-local.js --all --brand "Висота 890 — mountain retreat"

# Force re-analysis even if analysis.json cache exists
node scripts/run-local.js --handles h1,h2 --force
```

**Expected profile layout** (`profiles/{handle}/`):

- `grid.jpg` — grid screenshot (optional)
- `post_1.jpg`, `post_2.jpg`, `post_3.jpg` — post images (optional)
- `captions.json` — array of caption strings (optional)
- `analysis.json` — written by the script (cache, skipped on re-run)

**Output:** `audience_report.json` in the project root.

Bypasses: DB, pgvector, Apify, report signing, audit trail.
Reuses: prompt templates, sanitizeCaption(), Anthropic API directly.

---

## Canva Presentation Generation

Two-step process: a deterministic JS preprocessing step (no MCP), then a Claude Code session for the MCP tool calls.

### Step 1 — Upload images (once per batch)

**Skip if `asset_map.json` already exists and is up to date.**

```bash
node upload_assets.js
```

Uploads all profile images to Canva and writes `asset_map.json`.

### Step 2 — Build the query (terminal, not Claude Code)

```bash
node scripts/prepare-canva.js
# Force compact mode if the query exceeds the API limit:
node scripts/prepare-canva.js --compact
```

Reads `audience_report.json` + `asset_map.json`. Outputs:

- `query_debug.txt` — fully resolved query, zero `{{ }}` placeholders
- `presentation_manifest.json` — `{ "asset_ids": [...], "total_slides": N }`

Review the printed summary (missing assets, slide/photo counts) before proceeding.

### Step 3 — Generate the design (Claude Code session)

Tell Claude Code:

> "Generate the Canva presentation: read `query_debug.txt` for the query and `presentation_manifest.json` for the asset IDs, then call generate-design."

Claude Code will:

1. Read both files
2. Call `mcp__Canva__generate-design` with `design_type: "presentation"`, `asset_ids` from manifest, `query` from `query_debug.txt` byte-for-byte
3. If the call fails → re-run `node scripts/prepare-canva.js --compact` and retry
4. Call `mcp__Canva__create-design-from-candidate` with the returned `job_id` + first `candidate_id`
5. Share the design URL

**Why this two-step split:** All template logic lives in `scripts/prepare-canva.js` (deterministic, testable). Claude Code's role is narrowly scoped to file reads + MCP calls — no query construction happens inside the session, eliminating the two previous failure modes (image inconsistency from silent template errors, query failures from unresolved placeholders).
