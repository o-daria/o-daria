# Integration Test Instructions

Integration tests verify the interactions **between** units: FE ↔ BE auth flow, nginx ↔ API proxy, full Google Sign-In journey, and session lifecycle.

---

## Test 1: Google Sign-In end-to-end (local stack)

**Prerequisites**: Local stack running (`docker compose -f docker-compose.local.yml up --build`), real `GOOGLE_CLIENT_ID` in `.env.local`.

### 1a — Full auth flow

1. Open `http://localhost:8080` in browser
2. Confirm redirect to `http://localhost:8080/auth/login`
3. Confirm Google Sign-In button visible (no email/password inputs)
4. Click button → Google popup appears → select a Google account
5. After consent → redirect to `http://localhost:8080/projects`
6. Open DevTools → Application → Local Storage → `http://localhost:8080`
7. Confirm both keys exist:
   - `app.token` — non-empty string (hex session token)
   - `app.user` — JSON object with `{ id, email, name, createdAt }`
8. Confirm Network tab → `POST /api/auth/google` returned 200 with `{ token, user }`

### 1b — Session persistence

1. After successful login, hard-reload the page (`Cmd+Shift+R`)
2. Confirm: stays on `/projects` (not redirected to `/auth/login`)
3. Confirm: `Authorization: Bearer <token>` header present on API requests

### 1c — Logout

1. Find and click logout button/action in the app
2. Confirm: redirect to `/auth/login`
3. Confirm: `app.token` and `app.user` removed from localStorage
4. Confirm: subsequent API requests do NOT include `Authorization` header

### 1d — Protected route without token

1. Clear localStorage manually (DevTools → Application → Local Storage → Clear All)
2. Navigate to `http://localhost:8080/projects` directly
3. Confirm: redirect to `/auth/login` (withAuthGuard working)

---

## Test 2: BE authentication middleware

**Tests the `authenticate` middleware interaction with both session tokens and API_KEY fallback.**

```bash
# These tests use the running local stack (http://localhost:8080/api → BE)

# 2a: No token → 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/reports
# Expected: 401

# 2b: Wrong token → 401
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token" \
  http://localhost:8080/api/reports
# Expected: 401

# 2c: API_KEY fallback still works (dev-only, set API_KEY in .env.local)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer local-dev-key" \
  http://localhost:8080/api/reports
# Expected: 200 (even if no reports exist — empty array, not 401)

# 2d: Valid session token from login → 200
# (capture token from localStorage after login, then:)
TOKEN="<token-from-localStorage>"
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/reports
# Expected: 200
```

---

## Test 3: Module Federation — MFE loading

```bash
# Verify all MFE remote entry points are served correctly

curl -I http://localhost:8080/mfe-auth/remoteEntry.js
# Expected: HTTP/1.1 200, Content-Type: application/javascript

curl -I http://localhost:8080/mfe-projects/remoteEntry.js
# Expected: HTTP/1.1 200, Content-Type: application/javascript

curl -I http://localhost:8080/mfe-reports/remoteEntry.js
# Expected: HTTP/1.1 200, Content-Type: application/javascript

curl -I http://localhost:8080/mfe-canva/remoteEntry.js
# Expected: HTTP/1.1 200, Content-Type: application/javascript
```

In the browser, open DevTools → Network tab, filter by `remoteEntry.js`. After loading `http://localhost:8080`, confirm all 4 remoteEntry files load with 200 (not 404 or CORS errors).

---

## Test 4: CORS — nginx origin allowed

```bash
# 4a: Same-origin request (nginx origin) — should be allowed
curl -s -H "Origin: http://localhost:8080" \
  -H "Authorization: Bearer local-dev-key" \
  http://localhost:8080/api/health
# Expected: 200, Access-Control-Allow-Origin header present

# 4b: Unknown origin — should be rejected
curl -s -I -H "Origin: http://evil.example.com" \
  http://localhost:8080/api/health
# Expected: no Access-Control-Allow-Origin header in response
```

---

## Test 5: DB schema verification

```bash
# Verify all 3 schema files applied correctly
docker compose -f docker-compose.local.yml exec db \
  psql -U postgres -d audience_intelligence -c "
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  "
# Expected tables include: users, sessions, reports, job_audit, 
#   profile_analyses, segment_library, prompt_versions, tenants
```

---

## Test 6: Unit 1 ↔ Unit 2 contract verification

Verifies the agreed contract: `POST /auth/google` → `{ token, user: { id, email, name, createdAt } }`

```bash
# Use a real Google credential (from the Google OAuth Playground or browser network tab)
# This requires a valid but throwaway Google ID token for testing
CREDENTIAL="<google-id-token>"

curl -s -X POST http://localhost:8080/api/auth/google \
  -H "Content-Type: application/json" \
  -d "{\"credential\": \"$CREDENTIAL\"}" | jq .

# Expected response shape:
# {
#   "token": "<64-char hex string>",
#   "user": {
#     "id": "<uuid>",
#     "email": "<google-email>",
#     "name": "<google-display-name>",
#     "createdAt": "<ISO timestamp>"
#   }
# }
```

---

## Test 7: Session expiry (manual)

To verify sessions expire after 30 days:

```sql
-- Connect to DB and manually expire a session
docker compose -f docker-compose.local.yml exec db \
  psql -U postgres -d audience_intelligence -c "
    UPDATE sessions SET expires_at = NOW() - INTERVAL '1 second'
    WHERE token = '<your-token>';
  "
```

Then try: `curl -H "Authorization: Bearer <your-token>" http://localhost:8080/api/reports`
Expected: 401 (expired session rejected)
