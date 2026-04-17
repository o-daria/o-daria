import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProjectsApiService } from "@app/api-client";
import type { Project, ProjectInput } from "@app/api-client";

const KEYS = {
  list: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};

export function useProjects() {
  return useQuery({ queryKey: KEYS.list, queryFn: () => ProjectsApiService.getProjects() });
}

export function useProject(id: string) {
  return useQuery({ queryKey: KEYS.detail(id), queryFn: () => ProjectsApiService.getProject(id) });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => ProjectsApiService.createProject(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) => ProjectsApiService.updateProject(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ProjectsApiService.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useStartAnalysis(project: Project) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => ProjectsApiService.startAnalysis({ brand: project.brandName, brand_input: project.brandDna, project_id: project.projectId }, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(project.projectId) }),
  });
}
