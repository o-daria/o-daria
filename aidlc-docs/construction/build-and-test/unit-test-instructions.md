# Unit Test Instructions

## Backend — `o_daria_be`

**Framework**: Vitest (`vitest.config.js` at BE root)

```bash
cd o_daria_be

# Run all unit + integration tests (mocked DB/LLM)
npm test
# Alias: npx vitest run

# Watch mode (development)
npm run test:watch

# Run tests for a specific subsystem
npx vitest run src/safety/         # Input sanitization, PII, output signing
npx vitest run src/rag/            # Profile cache, segment library, embeddings
npx vitest run src/pipeline/       # Orchestrator, validateJob
npx vitest run src/app.test.js     # HTTP integration (mocked)
```

**New tests added in Unit 1** (in `src/app.test.js`):
- `POST /auth/google` — validates `credential` field, calls Google verifier, returns `{ token, user }`
- `authenticate` middleware — session token lookup, tenant isolation
- Missing/invalid `credential` → 400
- Invalid Google token → 401
- Valid flow → 200 + `{ token, user }` shape

**Verify these specific test cases pass:**
```bash
npx vitest run src/app.test.js --reporter=verbose
# Look for: "POST /auth/google" describe block
# Expected: all auth-related tests green
```

**Existing tests that must still pass (regression):**
```bash
npx vitest run src/safety/
# inputSanitizer — INJECTION_PATTERNS unchanged
# outputSigner — report signing/verification
# piiHandler — PII scrubbing

npx vitest run src/rag/
# profileCache — cache hit/miss, pseudonymization
# segmentLibrary — tenant isolation filter still enforced

npx vitest run src/pipeline/
# orchestrator — ValidationError flow, clarification retry
# validateJob — critical/non-critical issue detection
```

**Coverage baseline** (existing, must not regress):
```bash
npx vitest run --coverage
# Key: safety/ coverage should remain near 100%
```

---

## Frontend — `o_daria_ui`

**Framework**: Vitest + React Testing Library (`vitest.config.ts` per package/app)

```bash
cd o_daria_ui

# Run all FE tests (turbo, all packages + apps)
pnpm test

# Run specific package tests
pnpm --filter @app/auth test
pnpm --filter @app/api-client test
pnpm --filter @app/ui test
```

**New/modified tests from Unit 2** — verify these pass:

### `@app/auth` package

```bash
pnpm --filter @app/auth test -- --reporter=verbose
```

**`tokenStorage.test.ts`** — new methods must be tested:
- `getToken()` — returns null when not set, returns value when set
- `setToken(token)` — persists to `localStorage` under key `app.token`
- `clearAll()` — removes both `app.user` and `app.token`

**`AuthProvider.test.tsx`** — updated behaviour:
- `loginWithGoogle(credential)` → calls `AuthService.loginWithGoogle`, stores token + user, navigates to `/projects`
- `logout()` → clears storage, deletes `Authorization` header, navigates to `/auth/login`
- Mount with stored token + user → restores session (stays authenticated), `isLoading` becomes false

**`AuthService.test.ts`** — new method:
- `loginWithGoogle(credential)` → delegates to `googleAuthService`, returns `GoogleAuthResponse`

**Verify no regressions in:**
- `withAuthGuard.test.tsx` — redirect on unauthenticated, pass-through on authenticated + `isLoading` gate

### `@app/ui` package

```bash
pnpm --filter @app/ui test
# All UI component tests should pass unchanged (no Unit 2 changes to @app/ui)
```

### `@app/api-client` package

```bash
pnpm --filter @app/api-client test
# Should pass unchanged (no Unit 2 changes to api-client source)
```

---

## Smoke Test — `o_daria_be`

**Requires**: `DATABASE_URL_TEST` env var pointing to a test PostgreSQL instance (separate from dev DB).

```bash
cd o_daria_be

# Set test DB URL (create a separate DB for smoke tests)
export DATABASE_URL_TEST="postgres://postgres:postgres@localhost:5432/ai_test"

# Run the full pipeline smoke test
npx vitest run test/pipeline.smoke.test.js --reporter=verbose
```

The smoke test exercises the complete pipeline (fetch → analyze → aggregate → validate) with:
- Mocked LLM responses (no Anthropic API calls)
- Real PostgreSQL test DB (pgvector extension required)
- Verifies report signing, tenant isolation, segment library writes

**Note**: The smoke test is pre-existing and should pass without modification — Unit 1 auth changes are in separate routes/middleware, not in the pipeline itself.
