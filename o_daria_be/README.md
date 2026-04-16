# Audience Intelligence

Instagram audience analysis pipeline for marketing teams. Takes a brand description + Instagram handles, analyzes profiles with Claude (vision + text), and produces audience reports with segments, alignment scores, and content strategy.

Three ways to run: **local** (no infrastructure), **hybrid** (Docker DB + local images), and **production** (full stack).

---

## Prerequisites (all modes)

| Dependency        | Version | Notes                                                 |
| ----------------- | ------- | ----------------------------------------------------- |
| Node.js           | >= 18   | ESM (`"type": "module"`)                              |
| Anthropic API key |         | Sonnet for analysis, Haiku for aggregation/validation |

Additional dependencies by mode:

|                       | Local | Hybrid                     | Production                 |
| --------------------- | ----- | -------------------------- | -------------------------- |
| Docker + Compose      |       | required                   | required                   |
| Ollama                |       | via Docker (default)       | via Docker or host         |
| OpenAI API key        |       | optional (replaces Ollama) | optional (replaces Ollama) |
| Apify token           |       |                            | required (scraping)        |
| PostgreSQL + pgvector |       | via Docker                 | via Docker or managed      |

**Embeddings:** Hybrid and production modes need an embedding provider for the three pgvector RAG systems. By default, Ollama runs inside Docker with `nomic-embed-text` (768 dimensions, free). To use OpenAI instead, set `EMBEDDING_PROVIDER=openai` and provide `OPENAI_API_KEY` — then update `vector(768)` → `vector(1536)` in both schema files and rebuild the DB.

Install Node dependencies:

```bash
npm install
```

---

## Environment setup

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

Required variables differ by mode:

| Variable             | Local    | Hybrid        | Production    | Purpose                                                |
| -------------------- | -------- | ------------- | ------------- | ------------------------------------------------------ |
| `ANTHROPIC_API_KEY`  | required | required      | required      | Claude API (Sonnet + Haiku)                            |
| `EMBEDDING_PROVIDER` |          | optional      | optional      | `ollama` (default) or `openai`                         |
| `EMBEDDING_BASE_URL` |          | set by Docker | set by Docker | Ollama endpoint (default: `http://localhost:11434/v1`) |
| `EMBEDDING_MODEL`    |          | optional      | optional      | Override model name (default: `nomic-embed-text`)      |
| `OPENAI_API_KEY`     |          | if openai     | if openai     | Only needed when `EMBEDDING_PROVIDER=openai`           |
| `APIFY_TOKEN`        |          |               | required      | Instagram profile scraping                             |
| `API_KEY`            |          | required      | required      | Bearer auth for the HTTP API                           |
| `TENANT_ID`          |          | required      | required      | Dev-mode tenant identifier                             |
| `DATABASE_URL`       |          | set by Docker | set by Docker | PostgreSQL connection string                           |
| `BRAND_NAME`         | optional |               |               | Shortcut for `--brand` flag                            |
| `BRAND_VALUES`       | optional |               |               | Appended to BRAND_NAME                                 |

---

## Profile directory layout

Local and hybrid modes read from `profiles/`. Each handle gets its own directory:

```
profiles/
  handle_name/
    grid.jpg              # grid screenshot (jpg/png/webp)
    post_1.jpg            # post image 1
    post_2.jpg            # post image 2
    post_3.jpg            # post image 3
    captions.json         # ["caption 1", "caption 2", ...]
```

All files are optional, but at least one image (grid or post) is required per handle. Captions can also be in `captions.txt` with entries separated by `\n---\n`.

---

## Mode 1: Local

Runs analysis and aggregation directly against the Anthropic API. No database, no Docker, no pgvector, no HTTP server.

### What runs

- Brand DNA compilation (Haiku)
- Per-profile analysis (Sonnet) with file-based cache
- Report aggregation (Haiku)

### What is skipped

- PostgreSQL / pgvector
- RAG calibration (no few-shot examples, no historical segments)
- Semantic validation gate
- Report signing and integrity checksums
- Audit trail
- PII pseudonymization

### Run

```bash
# Analyze specific handles
node scripts/run-local.js --handles handle1,handle2,handle3 \
  --brand "Висота 890 — mountain retreat, premium but not pretentious"

# Analyze everything in profiles/
node scripts/run-local.js --all --brand "Brand description here"

# Force re-analysis (ignore cached analysis.json files)
node scripts/run-local.js --handles handle1,handle2 --force
```

### Output

- `profiles/{handle}/analysis.json` — cached per-profile result (reused on next run unless `--force`)
- `audience_report.json` — final aggregated report

### Cost

~$0.01 per profile (Sonnet) + ~$0.003 aggregation (Haiku). A 10-handle run costs about $0.11.

---

## Mode 2: Hybrid (recommended for testing)

Full production pipeline running in Docker (API + PostgreSQL with pgvector), but reads profile images from your local `profiles/` directory instead of scraping via Apify.

### What runs (everything except Apify)

- Express HTTP API with auth
- PostgreSQL with pgvector extension
- Brand DNA compilation
- Per-profile analysis via Sonnet Batch API
- pgvector profile cache (45-day TTL, skips Sonnet on cache hits)
- pgvector RAG calibration (k=2 similar profiles as few-shot examples)
- Report aggregation with segment library RAG (k=5 historical segments)
- Semantic validation gate (Haiku) with clarification retry
- Report signing (sha256 integrity checksum)
- PII pseudonymization (handle hashing)
- Audit trail (job_audit table)
- Segment library indexing (cross-report learning)

### What is skipped

- Apify scraping (replaced by local file read)

### Setup and run

```bash
# 1. Start everything
docker compose up --build

# 2. Verify
curl http://localhost:3300/health
# → {"ok":true,"ts":"..."}

# 3. Submit a report
curl -X POST http://localhost:3300/reports \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_input": "Висота 890 — mountain retreat, premium but not pretentious",
    "handles": ["handle1", "handle2", "handle3"]
  }'
# → {"report_id":"uuid","status":"pending","poll_url":"/reports/uuid"}

# 4. Poll for result
curl http://localhost:3300/reports/REPORT_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

The handle names in the `handles` array must match directory names in `profiles/`. Handles without a matching directory are skipped with a warning in the logs.

### Development tools (DB & Ollama UI)

The dev overlay adds Adminer (database browser) and Open WebUI (Ollama dashboard):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Tool       | URL                     | Purpose                             |
| ---------- | ----------------------- | ----------------------------------- |
| Adminer    | `http://localhost:8080` | Browse tables, run SQL queries      |
| Open WebUI | `http://localhost:3001` | View Ollama models, test embeddings |

**Adminer login:** server `db`, user `postgres`, password `postgres`, database `audience_intelligence`.

**Open WebUI:** first visit requires creating a local account (stored in a Docker volume).

### Tear down

```bash
docker compose down           # stop containers, keep data
docker compose down -v        # stop containers, delete database volume
```

### Cost

Same API costs as local (~$0.01/profile + $0.003 aggregation). **Embedding costs: zero** — Ollama runs locally in Docker. No Apify charges. No infrastructure costs.

---

## Mode 3: Production

Full pipeline including live Instagram scraping via Apify.

### Setup

1. Edit `docker-compose.yml` — remove (or set to `"false"`) the hybrid-mode variables:

```yaml
environment:
  DATABASE_URL: postgres://postgres:postgres@db:5432/audience_intelligence
  PORT: 3300
  # Remove or set to false:
  # USE_LOCAL_PROFILES: "true"
  # PROFILES_DIR: /app/profiles
```

2. Remove the profiles volume mount (the `volumes` block under `api`) since Apify provides the images.

3. Ensure `.env` includes `APIFY_TOKEN`.

4. Start:

```bash
docker compose up --build
```

The API and usage are identical to hybrid mode. The only difference is that `fetchProfiles()` calls the Apify Instagram scraper instead of reading from disk.

### Cost

Apify adds ~$0.05 per profile. A 24-handle report costs ~$1.30 first run, ~$0.30 on repeat (profile cache hits skip Sonnet entirely). Apify free tier provides $5/month credit (~100 profiles). Embedding costs are zero with Ollama (default).

---

## Precautions

### API keys

- Never commit `.env`. It is already in `.dockerignore` and should be in `.gitignore`.
- The `API_KEY` variable is the bearer token clients use to authenticate. Choose a strong random value for anything beyond local testing.
- `TENANT_ID` is a dev shortcut. Production auth should map bearer tokens to tenant IDs via a proper auth system (Clerk, Auth0, or custom).

### Database

- The pgvector IVFFlat indexes require a minimum number of rows to be effective. On a fresh database with fewer than ~100 profile analyses, RAG calibration results may be low quality. This is expected — quality improves as the cache accumulates data.
- The `pg_data` Docker volume persists between restarts. Use `docker compose down -v` to reset the database completely. This destroys all cached analyses, segment library data, and reports.
- The schema has a known discrepancy: `schema.sql` defines `projects`/`job_events` (planned schema), while the running code uses `reports`/`job_audit` (runtime schema in `schema_runtime.sql`). Both are applied on first boot. Do not remove either file.

### Pipeline behavior

- The Sonnet Batch API is asynchronous. Reports take 2-5 minutes depending on the number of cache-miss profiles. The API returns 202 immediately — poll `GET /reports/:id` for the result.
- If a profile directory in `profiles/` contains no images (no grid, no posts), that handle is silently skipped. Check container logs (`docker compose logs api`) if handles are missing from the report.
- Validation failures trigger one automatic retry with enriched context (clarification notes in Ukrainian). If the retry also fails, the report status is set to `failed`. Check the audit trail at `GET /reports/:id/audit` for details.
- `audience_report.json` is only written by the local runner. Hybrid and production modes store reports in PostgreSQL — retrieve them via the API.

### Safety invariants

These are enforced by the codebase. Do not circumvent them:

- **Tenant isolation**: Segment library queries always filter `WHERE tenant_id != requesting_tenant`. Cross-tenant segment data is used for calibration, never exposed directly.
- **Prompt injection defense**: All Instagram captions pass through `sanitizeCaption()` (XML wrapping + injection pattern detection) before reaching any LLM call.
- **Report signing**: Every completed report is signed with a sha256 checksum. The GET endpoint verifies the checksum before returning — a tampered report returns HTTP 500.
- **PII handling**: Unless `keep_handles: true` is passed in the POST body, all handles in the stored report are replaced with sha256 hashes.

### Costs to watch

- **Sonnet Batch API** is the largest variable cost. The profile cache (45-day TTL) is the primary cost control — repeated handles across reports are served from cache at zero Sonnet cost.
- **Apify free tier** provides $5/month. At ~$0.05/profile, that covers ~100 profiles. Exceeded usage is billed by Apify.
- **Embeddings**: Ollama (default) is free. If using OpenAI (`EMBEDDING_PROVIDER=openai`), text-embedding-3-small costs ~$0.02 per million tokens — rounds to zero for typical usage.
- **Haiku calls** (brand DNA, aggregation, validation) cost < $0.01 per report combined.

---

## Quick reference

| Command                                                             | What it does                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| `npm run local`                                                     | Alias for `node scripts/run-local.js`                   |
| `npm run dev`                                                       | Start API with auto-restart (requires local PostgreSQL) |
| `npm start`                                                         | Start API (production, no watch)                        |
| `npm run migrate`                                                   | Apply schema to `$DATABASE_URL`                         |
| `npm run seed-prompts`                                              | Register prompt versions in database                    |
| `npm test`                                                          | Run all tests                                           |
| `npm run prepare-canva`                                             | Build Canva query from report + asset map               |
| `docker compose up --build`                                         | Start hybrid/production stack                           |
| `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` | Start with dev tools (Adminer + Open WebUI)             |
| `docker compose down -v`                                            | Stop stack and delete database                          |
