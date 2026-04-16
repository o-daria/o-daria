import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

async function enableMocking(): Promise<void> {
  if (process.env["NODE_ENV"] !== "development") return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

async function bootstrap(): Promise<void> {
  await enableMocking();

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element #root not found in document");

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
