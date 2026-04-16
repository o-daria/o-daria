# Business Rules — U-02: mfe-auth

**Unit**: U-02  
**Date**: 2026-04-07

- BR-AUTH2-01: Login form calls `useAuth().login()` — never calls AuthService directly
- BR-AUTH2-02: Registration calls `AuthService.register()` then `useAuth().login()` to auto-login
- BR-AUTH2-03: On successful login, navigation to /projects handled by AuthProvider (U-01)
- BR-AUTH2-04: If authenticated user visits /auth/*, redirect to /projects (reverse guard)
- BR-AUTH2-05: Password reset token read from URL search param `?token=`
- BR-AUTH2-06: Brute force display — after 5 failed login attempts, show lockout message from API error response
- BR-AUTH2-07: All error messages shown via `ErrorMessage` component — generic, no internal details
- BR-AUTH2-08: All forms show loading state (Button isLoading) during async submission
- BR-AUTH2-09: Local dev — MSW intercepts API calls; no real backend needed to run locally
