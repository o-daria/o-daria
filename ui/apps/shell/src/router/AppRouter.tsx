import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "../components/AuthGuard";
import { GlobalLayout } from "../components/layout/GlobalLayout";
import { ModuleLoader } from "../components/ModuleLoader";

// Module Federation remotes — types declared in src/remotes.d.ts
const AuthModule = lazy(() => import("mfe_auth/Module"));
const ProjectsModule = lazy(() => import("mfe_projects/Module"));

export function AppRouter(): React.ReactElement {
  return (
    <Routes>
      {/* Public — auth pages, no shell chrome */}
      <Route
        path="/auth/*"
        element={
          <ModuleLoader remote="mfe_auth/Module">
            <AuthModule />
          </ModuleLoader>
        }
      />

      {/* Protected — all app pages inside GlobalLayout */}
      <Route
        path="/projects/*"
        element={
          <AuthGuard>
            <GlobalLayout>
              <ModuleLoader remote="mfe_projects/Module">
                <ProjectsModule />
              </ModuleLoader>
            </GlobalLayout>
          </AuthGuard>
        }
      />

      <Route path="/" element={<Navigate to="/projects" replace />} />

      <Route
        path="*"
        element={
          <GlobalLayout>
            <div className="flex h-full items-center justify-center">
              <p className="font-display text-2xl text-ink">Page not found.</p>
            </div>
          </GlobalLayout>
        }
      />
    </Routes>
  );
}
