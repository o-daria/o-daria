import { AuthProvider } from "@app/auth";
import { registerUnauthorizedHandler } from "@app/api-client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { AppRouter } from "./router/AppRouter";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";

function InnerApp(): React.ReactElement {
  const navigate = useNavigate();

  // Wire the 401 handler once the router is available
  registerUnauthorizedHandler(() => {
    navigate("/auth/login", { replace: true });
  });

  return (
    <AuthProvider navigate={navigate}>
      <GlobalErrorBoundary>
        <AppRouter />
      </GlobalErrorBoundary>
    </AuthProvider>
  );
}

export function App(): React.ReactElement {
  if (!googleClientId) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <strong>Configuration error:</strong> GOOGLE_CLIENT_ID is not set. The app cannot start.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InnerApp />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
