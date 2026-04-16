import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";

/**
 * mfe-auth Module Federation entry point.
 * Mounted at /auth/* by the Shell AppRouter.
 * Note: Register, ForgotPassword, and ResetPassword routes removed — Google Sign-In only.
 */
export default function AuthModule(): React.ReactElement {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      {/* Default: redirect /auth/* to /auth/login */}
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}
