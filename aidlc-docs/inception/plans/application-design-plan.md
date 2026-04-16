# Application Design Plan

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
If none of the options match, choose the last option (Other/X) and describe your preference.
Let me know when you're done.

---

## Q1: Google Auth Endpoint Location in BE

The BE currently has no `src/auth/` module — all routes are in `app.js`. Where should `POST /auth/google` live?

A) Keep it inline in `app.js` alongside all other routes (consistent with current pattern — no new files)
B) Extract to a dedicated `src/routes/auth.routes.js` module, mounted via `app.use('/auth', authRouter)` (separates auth from business routes)
X) Other (describe after [Answer]:)

[Answer]: B

---

## Q2: Google Token Validation — Placement

`OAuth2Client.verifyIdToken()` must run on every `POST /auth/google` call. Where should this validation logic live?

A) Inline in the route handler / auth routes file — keep it simple, no extra indirection
B) In a dedicated `src/services/googleAuthService.js` — wraps `OAuth2Client`, exposes `verifyGoogleToken(credential)` and `upsertUser(payload)` as testable functions
X) Other (describe after [Answer]:)

[Answer]: B

---

## Q3: Session Token — Middleware Placement

The updated `authenticate()` middleware will do a DB lookup (`sessions` table) instead of comparing `API_KEY`. Currently `authenticate` is defined inline in `app.js`. Should it stay there or move?

A) Stay inline in `app.js` — consistent with current codebase style, minimal refactor
B) Move to `src/middleware/auth.middleware.js` — alongside the existing `canvaToken.middleware.js` pattern
X) Other (describe after [Answer]:)

[Answer]: B

---

## Q4: S3 Client — Scope for This Release

FR-02 requires S3 storage for profile images. The `POST /reports` route currently uses `multer` with `memoryStorage`. How much S3 integration should be implemented now?

A) Full upload integration — images received via `POST /reports` are uploaded to S3 immediately; S3 key stored in DB; Canva job retrieves from S3
B) S3 client setup only (`src/services/s3Service.js` with `uploadToS3()` / `getSignedUrl()`) — wired into `POST /reports` to store images, but Canva retrieval can reference S3 key from DB (no pre-signed URL generation needed yet)
C) Defer S3 entirely — keep in-memory approach for this release (note: this conflicts with FR-02 / Q3=B from requirements)
X) Other (describe after [Answer]:)

[Answer]: B

## Q5: FE Auth Package — Backward Compatibility Exports

`@app/auth/src/index.ts` currently exports `LoginRequest`, `LoginResponse`, `RegisterRequest`, `RegisterResponse`, `ResetPasswordRequest`, and `AuthService.login/register/etc.`. After the migration, these types are removed. How should the package handle this?

A) Hard remove — delete all email/password types and methods; update any consuming code that references them (tests, other MFEs)
B) Soft remove — keep the type exports with `@deprecated` JSDoc but no runtime implementation; prevents build errors in code that imports but doesn't call them
X) Other (describe after [Answer]:)

[Answer]: B

## Q6: `AuthProvider` — API Client Token Injection

`AuthProvider.tsx` currently does NOT inject `Authorization: Bearer` into the shared `apiClient` (it only stores the user in localStorage). After the migration, the session token must be injected. Where is `apiClient` configured?

A) I don't know the exact location — detect it from the codebase and inject where appropriate
B) It's in `packages/@app/api-client/` or similar shared package — I'll confirm after you identify the file
X) Other (describe: exact path if known)

[Answer]: in `./ui/packages/@app/api-client/src/apiClient.ts`

## Q7: Email/Password Pages — Removal Scope

FR-01 requires removing Register, ForgotPassword, ResetPassword pages. Confirmed in requirements Q6=A. Just confirming scope:

A) Remove source files + routes + any navigation links that reference them (complete removal)
B) Remove routes only — leave source files in place (dead code, easier to recover)

[Answer]: B

## Q8: Terraform Rewrite — Scope Confirmation

The execution plan includes Terraform rewrite as Unit 4. The existing Terraform state (if any is deployed) could cause `terraform apply` conflicts. How should this be handled?

A) Treat as a net-new Terraform config — user will run `terraform destroy` on the old state first, then `terraform apply` the new config
B) Write migration-safe Terraform — use `moved` blocks or `terraform state mv` commands to map old resources to new names where possible
C) Don't worry about state migration — this is a first customer review environment, no live production state exists yet
X) Other (describe after [Answer]:)

[Answer]: C
