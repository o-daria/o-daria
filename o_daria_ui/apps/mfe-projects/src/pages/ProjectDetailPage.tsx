import { lazy, Suspense, useState } from "react";
import { Card, DecorativeDivider, ErrorMessage, Spinner, Button } from "@app/ui";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { ProjectStatusBadge } from "../components/ProjectStatusBadge";
import { DeleteProjectDialog } from "../components/DeleteProjectDialog";
import { StartAnalysisDialog } from "../components/StartAnalysisDialog";
import { useDeleteProject, useProject } from "../hooks/useProjects";

// MFE slots loaded via Module Federation
const ReportPanel = lazy(() => import("mfe_reports/ReportPanel"));
const CanvaPanel = lazy(() => import("mfe_canva/CanvaPanel"));

export function ProjectDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error, refetch } = useProject(id ?? "");
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();
  const [showDelete, setShowDelete] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !project) return <ErrorMessage message="Project not found." onRetry={() => void refetch()} />;

  const handleDelete = async (): Promise<void> => {
    await deleteProject(project.projectId);
    navigate("/projects");
  };

  const reportReady = project.status === "REPORT_READY" || project.status === "PRESENTATION_READY";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-disabled hover:text-ivory" aria-label="Back to projects">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="flex-1 font-display text-2xl font-semibold text-ivory">{project.brandName}</h1>
        <ProjectStatusBadge status={project.status || "DRAFT"} />
        {project.status == undefined && (
          <Button
            variant="primary"
            onClick={() => setShowAnalysis(true)}
            data-testid="start-analysis-button"
          >
            <Play size={14} aria-hidden className="mr-1" />
            Start analysis
          </Button>
        )}
        <button onClick={() => setShowDelete(true)} className="text-disabled hover:text-error" aria-label="Delete project" data-testid="delete-project-button">
          <Trash2 size={16} />
        </button>
      </div>

      <DecorativeDivider />

      <Card decorative>
        <dl className="space-y-4">
          <div>
            <dt className="font-body text-xs font-medium text-disabled uppercase tracking-wide">Brand values</dt>
            <dd className="mt-1 font-body text-sm text-ink whitespace-pre-wrap">{project.brandDna}</dd>
          </div>
        </dl>
      </Card>

      {/* Report slot — loaded from mfe-reports */}
      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-ivory">Audience Analysis Report</h2>
        <Suspense fallback={<Spinner size="md" />}>
          <ReportPanel
            projectId={id}
            initialStatus={project.status || "DRAFT"}
          />
        </Suspense>
      </div>

      <DecorativeDivider />

      {/* Canva slot — loaded from mfe-canva */}
      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-ivory">Canva Presentation</h2>
        <Suspense fallback={<Spinner size="md" />}>
          <CanvaPanel
            projectId={project.projectId}
            reportReady={reportReady}
            {...(project.canvaLink ? { existingCanvaLink: project.canvaLink } : {})}
          />
        </Suspense>
      </div>

      <StartAnalysisDialog
        open={showAnalysis}
        project={project}
        onSuccess={() => {
          setShowAnalysis(false);
          void refetch();
        }}
        onCancel={() => setShowAnalysis(false)}
      />

      <DeleteProjectDialog
        open={showDelete}
        projectName={project.brandName}
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
