import { Card, EmptyState, ErrorMessage, Spinner } from "@app/ui";
import { FolderOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { ProjectStatusBadge } from "../components/ProjectStatusBadge";
import { useProjects } from "../hooks/useProjects";

export function ProjectDashboard(): React.ReactElement {
  const { data: projects, isLoading, error, refetch } = useProjects();

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <ErrorMessage message="Failed to load projects." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Projects</h1>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 rounded-sm bg-button-primary-bg px-4 py-2 font-body text-sm text-ivory hover:bg-button-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-jade"
          data-testid="new-project-button"
        >
          <Plus size={16} aria-hidden /> New project
        </Link>
      </div>

      {projects?.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first audience analysis project to get started."
          illustration={<FolderOpen size={48} />}
          action={{ label: "Create your first project", onClick: () => window.location.assign("/projects/new") }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="projects-grid">
          {projects?.map((project) => (
            <Link
              key={project.projectId}
              to={`/projects/${project.projectId}`}
              className="block hover:shadow-card-hover transition-shadow"
              data-testid={`project-card-${project.projectId}`}
            >
              <Card decorative className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-ink line-clamp-2">{project.brandName}</h2>
                  <ProjectStatusBadge status={project.status || "DRAFT"} />
                </div>
                <p className="mt-2 font-body text-xs text-disabled line-clamp-2">{project.brandDna}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
