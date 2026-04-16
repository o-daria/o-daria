# Code Summary — U-02: mfe-auth

## Files Created

### `apps/mfe-auth/`
- `package.json` — deps: @app/auth, @app/ui, formik, yup, react-router-dom; devDeps: msw, @types/node, webpack
- `tsconfig.json` — extends base, path aliases for @app/auth, @app/ui
- `webpack.config.ts` — MF remote, exposes `./Module`, port 3001, CORS headers for Shell
- `index.html` — standalone dev entry
- `src/Module.tsx` — MF entry point, routes /auth/* sub-paths
- `src/main.tsx` — standalone dev bootstrap (starts MSW then mounts)
- `src/schemas.ts` — Yup schemas: loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema

### Pages
- `src/pages/LoginPage.tsx` — Formik+Yup login form, error display, links to register/forgot (US-AUTH-01, US-AUTH-02)
- `src/pages/RegisterPage.tsx` — Registration form, auto-login on success (US-AUTH-01)
- `src/pages/ForgotPasswordPage.tsx` — Email request form, success confirmation, email enumeration safe (US-AUTH-04)
- `src/pages/ResetPasswordPage.tsx` — Token-from-URL, new password form, success confirmation (US-AUTH-04)

### MSW Dev Mocks
- `src/mocks/handlers.ts` — intercepts all /auth/* endpoints with realistic mock responses
- `src/mocks/browser.ts` — MSW browser worker setup

### Shell updates
- `apps/shell/src/mocks/handlers.ts` — full app mock handlers (auth + stub /projects)
- `apps/shell/src/mocks/browser.ts` — Shell MSW worker
- `apps/shell/src/main.tsx` — updated to start MSW before React mount
- `apps/shell/package.json` — added msw + @types/node

## Stories Implemented
- US-AUTH-01 ✅ (register with email/password)
- US-AUTH-02 ✅ (login — LoginPage + AuthGuard already in U-01)
- US-AUTH-03 ✅ (logout — SidebarUserSection already in U-01)
- US-AUTH-04 ✅ (forgot password + reset password)

## Local Dev Instructions
```bash
pnpm install
npx msw init apps/shell/public --save
npx msw init apps/mfe-auth/public --save
pnpm dev
# Open http://localhost:3000
# Login with any email + password ≥ 8 chars (mocked)
```
