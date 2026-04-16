import { Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { LoginPage } from "./pages/LoginPage";

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";

/**
 * mfe-auth Module Federation entry point.
 * Mounted at /auth/* by the Shell AppRouter.
 * Note: Register, ForgotPassword, and ResetPassword routes removed — Google Sign-In only.
 *
 * GoogleOAuthProvider is scoped here because mfe-auth bundles its own copy of
 * @react-oauth/google (not shared via Module Federation), so the shell's provider
 * does not reach GoogleLogin components inside this federated module.
 */
export default function AuthModule(): React.ReactElement {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </GoogleOAuthProvider>
  );
}
