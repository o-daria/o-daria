import { AuthService, useAuth } from "@app/auth";
import { Button, Card, DecorativeDivider, ErrorMessage, Input } from "@app/ui";
import { useFormik } from "formik";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { registerSchema } from "../schemas";

export function RegisterPage(): React.ReactElement {
  const { login, isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/projects" replace />;

  const formik = useFormik({
    initialValues: { email: "", password: "", confirmPassword: "" },
    validationSchema: registerSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        await AuthService.register({ email: values.email, password: values.password });
        // Auto-login after successful registration
        await login({ email: values.email, password: values.password });
      } catch {
        setServerError("Registration failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-4xl text-gold">✦</span>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">o_daria</h1>
          <p className="mt-1 font-body text-sm text-disabled">Audience Analysis Platform</p>
        </div>

        <Card decorative>
          <h2 className="mb-6 font-display text-xl font-semibold text-ink">Create account</h2>

          {serverError && <ErrorMessage message={serverError} className="mb-4" />}

          <form onSubmit={formik.handleSubmit} noValidate data-testid="register-form">
            <div className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                data-testid="register-email-input"
                {...formik.getFieldProps("email")}
                error={formik.touched.email ? formik.errors.email : undefined}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                helpText="Minimum 8 characters"
                data-testid="register-password-input"
                {...formik.getFieldProps("password")}
                error={formik.touched.password ? formik.errors.password : undefined}
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                data-testid="register-confirm-password-input"
                {...formik.getFieldProps("confirmPassword")}
                error={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="mt-6 w-full"
              isLoading={formik.isSubmitting}
              data-testid="register-submit-button"
            >
              Create account
            </Button>
          </form>

          <DecorativeDivider className="my-4" />

          <p className="text-center font-body text-sm text-disabled">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="text-jade hover:underline"
              data-testid="register-login-link"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
