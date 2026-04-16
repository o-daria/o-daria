# Performance Test Instructions

# Marketing Audience Analysis Platform (ui)

## Scope

This is a frontend SPA with a synchronous backend API. Performance testing focuses on:

1. **Bundle size** — Webpack build output kept lean via Module Federation (shared singletons)
2. **Initial load time** — Shell + lazy-loaded MFE remotes
3. **Report API response time** — `POST /reports` is synchronous; latency is backend-owned

---

## Bundle Size Validation

After `pnpm build`, check dist sizes:

```bash
# Shell bundle analysis (install if needed)
cd apps/shell
npx webpack-bundle-analyzer dist/stats.json
```

To generate stats:

```bash
# In apps/shell/webpack.config.js, add to plugins temporarily:
# new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({ generateStatsFile: true })
pnpm --filter shell build
```

**Targets** (rough guidelines for MVP):
| Bundle | Target |
|---|---|
| shell initial JS | < 300 KB gzipped |
| Each MFE remoteEntry.js | < 100 KB gzipped |
| @app/ui shared components | Deduplicated via MF singleton |

---

## Lighthouse Audit (Initial Load)

```bash
# Requires Chrome and pnpm dev running
npx lighthouse http://localhost:3000 --view
```

**Target scores**:
| Category | Target |
|---|---|
| Performance | > 70 |
| Accessibility | > 90 |
| Best Practices | > 90 |

---

## API Response Time (Manual)

Since `POST /reports` is synchronous and can be slow (AI processing), measure end-to-end latency:

```bash
curl -w "\nTime: %{time_total}s\n" -X POST http://localhost:3000/reports \
  -H "Authorization: Bearer ramsey-packado" \
  -H "Content-Type: application/json" \
  -d '{"brand":"Test","brand_input":"Bold","handles":["test"],"keep_handles":false,"sync":true}'
```

**Note**: Backend response time is outside frontend control. The UI shows a loading state (`Button isLoading`) during the request — no timeout is enforced at MVP.

---

## Performance Status

Performance testing is **N/A as a blocking gate** for this MVP release. The frontend imposes no SLA on the backend AI processing time. Bundle size and Lighthouse targets are informational only.
