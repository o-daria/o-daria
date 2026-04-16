import { AuthService } from "@app/auth";
import { Button, Card, ErrorMessage, Input } from "@app/ui";
import { useFormik } from "formik";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPasswordSchema } from "../schemas";

export function ResetPasswordPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { newPassword: "", confirmPassword: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        await AuthService.resetPassword({ token, newPassword: values.newPassword });
        setDone(true);
      } catch {
        setServerError("This reset link is invalid or has expired.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <ErrorMessage
          message="Invalid reset link."
          onRetry={() => window.location.replace("/auth/forgot-password")}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-4xl text-gold">✦</span>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">o_daria</h1>
        </div>

        <Card decorative>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Set new password</h2>

          {done ? (
            <div data-testid="reset-password-confirmation">
              <p className="font-body text-sm text-ink">
                Your password has been updated.
              </p>
              <Link
                to="/auth/login"
                className="mt-4 block text-center font-body text-sm text-jade hover:underline"
              >
                Sign in with new password
              </Link>
            </div>
          ) : (
            <>
              {serverError && <ErrorMessage message={serverError} className="mb-4" />}
              <form onSubmit={formik.handleSubmit} noValidate data-testid="reset-password-form">
                <div className="flex flex-col gap-4">
                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    helpText="Minimum 8 characters"
                    data-testid="reset-password-new-input"
                    {...formik.getFieldProps("newPassword")}
                    error={formik.touched.newPassword ? formik.errors.newPassword : undefined}
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    data-testid="reset-password-confirm-input"
                    {...formik.getFieldProps("confirmPassword")}
                    error={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="mt-6 w-full"
                  isLoading={formik.isSubmitting}
                  data-testid="reset-password-submit-button"
                >
                  Update password
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
