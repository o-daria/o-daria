import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CanvaPanel from "./CanvaPanel";

async function prepare(): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }
}

const qc = new QueryClient();
const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

void prepare().then(() => {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <CanvaPanel projectId="dev-project" reportReady />
      </QueryClientProvider>
    </StrictMode>
  );
});
