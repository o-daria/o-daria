# Performance Test Instructions

## Scope

For MVP / first customer review with a single expected user, formal performance benchmarks are low priority. These tests establish a baseline and identify obvious bottlenecks before go-live.

---

## Test 1: API response times (baseline)

Uses `curl` timing — no external tools required.

```bash
# Health endpoint (warm path)
curl -s -o /dev/null -w "DNS: %{time_namelookup}s | Connect: %{time_connect}s | Total: %{time_total}s\n" \
  http://localhost:8080/api/health
# Acceptable: Total < 50ms

# Authenticated reports list (DB query path)
TOKEN="<token-from-login>"
curl -s -o /dev/null -w "Total: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/reports
# Acceptable: Total < 200ms (cold: < 500ms including DB connection pool warm-up)

# POST /auth/google (Google token verification + DB upsert)
# Note: Google token verification adds ~100-200ms network RTT
# Acceptable: Total < 1000ms (dominated by Google API call)
```

---

## Test 2: FE bundle sizes

Large bundles cause slow initial load. Check after `pnpm build`:

```bash
cd ui

GOOGLE_CLIENT_ID=test pnpm build 2>&1 | grep -E "dist/.*\.js" | awk '{print $NF, $(NF-1)}' | sort -k2 -rn | head -20
```

**Acceptable thresholds** (gzipped):
| Bundle | Threshold |
|--------|-----------|
| shell main chunk | < 250 KB |
| mfe-auth main chunk | < 150 KB |
| `@react-oauth/google` chunk | < 50 KB |
| Any single chunk | < 500 KB |

If any chunk exceeds the threshold, investigate with:

```bash
# Generate bundle analysis (requires webpack-bundle-analyzer or similar)
# Check if @react-oauth/google is being duplicated across MFEs
# It should only appear in mfe-auth (or shell if shared)
```

---

## Test 3: Docker startup time (local stack)

Measures time from `docker compose up` to all services healthy.

```bash
time docker compose -f docker-compose.local.yml up --wait
# Acceptable (first run, ollama pulling model): < 5 minutes
# Acceptable (subsequent runs, model cached): < 60 seconds
```

Check individual service startup:

```bash
docker compose -f docker-compose.local.yml ps
# All services should show "healthy" or "running" within the expected window
```

---

## Test 4: EC2 memory headroom (post-deploy, t4g.nano = 512 MB RAM)

After deploying to EC2 and running the full Docker stack:

```bash
# SSH via SSM (no SSH key needed)
aws ssm start-session --target <instance-id>

# Check memory usage
free -m
# Acceptable: < 400 MB used (leaves ~100 MB headroom)
# If > 450 MB: ollama model may OOM — consider t4g.micro (1 GB) for production

# Check Docker container memory
docker stats --no-stream
# api + db + ollama combined should be < 480 MB
```

**Known constraint**: t4g.nano has 512 MB RAM. The ollama `nomic-embed-text` model uses ~150 MB. PostgreSQL uses ~50-80 MB. The BE Node process uses ~100 MB. Total ~350-380 MB — within limits, but tight. If OOM-killed containers are observed in production, upgrade to t4g.micro (~$6/month).

---

## Test 5: CloudFront cache hit ratio (post-deploy)

After the FE is live and some traffic flows:

```bash
# Check cache hit rate via CloudFront metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=<CF_DISTRIBUTION_ID> \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 3600 \
  --statistics Average
# Target: > 80% for static assets
# remoteEntry.js + index.html are intentionally uncached (CachingDisabled policy)
```
