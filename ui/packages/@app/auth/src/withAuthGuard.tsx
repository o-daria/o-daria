import type { ComponentType } from "react";
import { useAuth } from "./useAuth";

export interface WithAuthGuardProps {
  redirectTo?: string;
}

/**
 * HOC that redirects to login when the user is not authenticated.
 * Usage: const ProtectedPage = withAuthGuard(MyPage);
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  redirectTo = "/auth/login"
): ComponentType<P & WithAuthGuardProps> {
  function GuardedComponent(props: P & WithAuthGuardProps): React.ReactElement | null {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      // Return null during load — shell-level Spinner handles the visual
      return null;
    }

    if (!isAuthenticated) {
      // Navigate is injected at the AuthProvider level for MFE compatibility;
      // here we use window.location for a simple, dependency-free redirect.
      window.location.replace(redirectTo);
      return null;
    }

    return <WrappedComponent {...props} />;
  }

  GuardedComponent.displayName = `withAuthGuard(${WrappedComponent.displayName ?? WrappedComponent.name})`;
  return GuardedComponent;
}
