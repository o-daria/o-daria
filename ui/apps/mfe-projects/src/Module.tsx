import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { EditProjectPage } from "./pages/EditProjectPage";
import { ProjectDashboard } from "./pages/ProjectDashboard";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export default function ProjectsModule(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route index element={<ProjectDashboard />} />
        <Route path="new" element={<CreateProjectPage />} />
        <Route path=":id" element={<ProjectDetailPage />} />
        <Route path=":id/edit" element={<EditProjectPage />} />
      </Routes>
    </QueryClientProvider>
  );
}
