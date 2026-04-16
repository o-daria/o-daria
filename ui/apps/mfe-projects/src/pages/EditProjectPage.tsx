import { Card, DecorativeDivider, ErrorMessage, Spinner } from "@app/ui";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectForm } from "../components/ProjectForm";
import { useProject, useUpdateProject } from "../hooks/useProjects";
import type { ProjectInput } from "@app/api-client";

export function EditProjectPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id ?? "");
  const { mutateAsync: updateProject } = useUpdateProject(id ?? "");

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !project) return <ErrorMessage message="Project not found." />;

  const handleSubmit = async (values: ProjectInput): Promise<void> => {
    await updateProject(values);
    navigate(`/projects/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Edit project</h1>
      <DecorativeDivider />
      <Card decorative>
        <ProjectForm
          initialValues={project}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
