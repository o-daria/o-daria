import { Card, DecorativeDivider } from "@app/ui";
import { useNavigate } from "react-router-dom";
import { ProjectForm } from "../components/ProjectForm";
import { useCreateProject } from "../hooks/useProjects";
import type { ProjectInput } from "@app/api-client";

export function CreateProjectPage(): React.ReactElement {
  const navigate = useNavigate();
  const { mutateAsync: createProject } = useCreateProject();

  const handleSubmit = async (values: ProjectInput): Promise<void> => {
    const project = await createProject(values);
    navigate(`/projects/${project.projectId}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">New project</h1>
      <DecorativeDivider />
      <Card decorative>
        <ProjectForm onSubmit={handleSubmit} submitLabel="Create project" />
      </Card>
    </div>
  );
}
