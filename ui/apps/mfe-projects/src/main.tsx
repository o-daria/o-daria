import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@app/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsModule from "./Module";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider navigate={(p) => window.location.assign(p)}>
          <ProjectsModule />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
