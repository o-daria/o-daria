# Domain Entities — U-02: mfe-auth

**Unit**: U-02  
**Date**: 2026-04-07

All auth types are defined in `@app/auth/src/types.ts` (U-01). U-02 owns only form-level validation schemas.

## Form Schemas (Formik + Yup)

```typescript
// Login
{ email: string (required, valid email), password: string (required, min 8) }

// Register
{ email: string (required, valid email), password: string (required, min 8), confirmPassword: string (must match password) }

// Forgot Password
{ email: string (required, valid email) }

// Reset Password
{ newPassword: string (required, min 8), confirmPassword: string (must match newPassword) }
// token: string — read from URL param, not user input
```
