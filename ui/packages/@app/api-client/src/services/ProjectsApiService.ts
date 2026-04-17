import { apiClient } from "../apiClient";
import type {
  Project,
  ProjectInput,
  CreateProjectRequest,
  CreateProjectResponse,
  StartAnalysisResponse,
} from "../types";

// MVP dev token — scoped to this service only
const AUTH_TOKEN = "ramsey-packado";


export const ProjectsApiService = {
  async createProject(input: ProjectInput): Promise<Project> {
    const payload: CreateProjectRequest = {
      brand: input.name,
      brand_input: input.brand_input,
    };
    const { data } = await apiClient.post<CreateProjectResponse>("/projects", payload, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    return data;
  },

  async startAnalysis({ brand_input, brand, project_id }: { brand_input: string, brand: string, project_id: string }, files: File[]): Promise<StartAnalysisResponse> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("brand_input", brand_input);
    formData.append("brand", brand);
    formData.append("project_id", project_id);
    formData.append("sync", "true");
    const { data } = await apiClient.post<StartAnalysisResponse>("/reports", formData, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  async getProjects(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>("/projects", {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      }
    });
    return data;
  },

  async getProject(projectId: string): Promise<Project> {
    const { data } = await apiClient.get<Project>(`/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      }
    });
    return data;
  },

  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}`);
  },
};
