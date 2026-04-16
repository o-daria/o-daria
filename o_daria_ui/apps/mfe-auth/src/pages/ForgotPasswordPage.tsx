import { AuthService } from "@app/auth";
import { Button, Card, ErrorMessage, Input } from "@app/ui";
import { useFormik } from "formik";
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordSchema } from "../schemas";

export function ForgotPasswordPage(): React.ReactElement {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        await AuthService.requestPasswordReset(values.email);
        setSubmitted(true);
      } catch {
        // Always show success to prevent email enumeration (BR-AUTH-04 / US-AUTH-04)
        setSubmitted(true);
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
        </div>

        <Card decorative>
          <h2 className="mb-2 font-display text-xl font-semibold text-ink">Reset password</h2>

          {submitted ? (
            <div data-testid="forgot-password-confirmation">
              <p className="font-body text-sm text-ink">
                If that email is registered, you'll receive a reset link shortly.
              </p>
              <Link
                to="/auth/login"
                className="mt-4 block text-center font-body text-sm text-jade hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 font-body text-sm text-disabled">
                Enter your email and we'll send you a reset link.
              </p>
              {serverError && <ErrorMessage message={serverError} className="mb-4" />}
              <form onSubmit={formik.handleSubmit} noValidate data-testid="forgot-password-form">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  data-testid="forgot-password-email-input"
                  {...formik.getFieldProps("email")}
                  error={formik.touched.email ? formik.errors.email : undefined}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="mt-4 w-full"
                  isLoading={formik.isSubmitting}
                  data-testid="forgot-password-submit-button"
                >
                  Send reset link
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/auth/login" className="font-body text-sm text-jade hover:underline">
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
