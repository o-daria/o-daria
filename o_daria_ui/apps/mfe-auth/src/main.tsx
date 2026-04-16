/**
 * Standalone dev entry for mfe-auth.
 * When run via the Shell, Module.tsx is loaded via Module Federation instead.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@app/auth";

async function enableMocking(): Promise<void> {
  if (process.env["NODE_ENV"] !== "development") return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

async function bootstrap(): Promise<void> {
  await enableMocking();

  const { default: AuthModule } = await import("./Module");

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("#root not found");

  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider navigate={(path) => window.location.assign(path)}>
          <AuthModule />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

void bootstrap();
