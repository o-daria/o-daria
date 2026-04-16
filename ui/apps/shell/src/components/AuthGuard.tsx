import { useAuth } from "@app/auth";
import { Spinner } from "@app/ui";
import { Navigate } from "react-router-dom";

export interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * US-AUTH-02: Deny-by-default route protection.
 * Renders a spinner while auth state is loading.
 * Redirects to /auth/login when unauthenticated.
 */
export function AuthGuard({
  children,
  redirectTo = "/auth/login",
}: AuthGuardProps): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-surface"
        data-testid="auth-guard-loading"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
