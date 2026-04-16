import { useAuth } from "@app/auth";
import { Card, DecorativeDivider } from "@app/ui";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export function LoginPage(): React.ReactElement {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // BR-FE-AUTH-09: redirect authenticated users away
  if (isAuthenticated) return <Navigate to="/projects" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        {/* Chinoiserie brand mark */}
        <div className="mb-8 text-center">
          <span className="font-display text-4xl text-gold">✦</span>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">o_daria</h1>
          <p className="mt-1 font-body text-sm text-disabled">Audience Analysis Platform</p>
        </div>

        <Card decorative>
          <h2 className="mb-6 font-display text-xl font-semibold text-ink">Sign in</h2>

          <DecorativeDivider className="mb-6" />

          <div className="flex flex-col items-center gap-4">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setError(null);
                if (!credentialResponse.credential) {
                  setError("Google sign-in failed. Please try again.");
                  return;
                }
                try {
                  await loginWithGoogle(credentialResponse.credential);
                } catch {
                  setError("Sign-in failed. Please try again.");
                }
              }}
              onError={() => {
                setError("Google sign-in failed. Please try again.");
              }}
            />

            {error && (
              <p className="text-center font-body text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
