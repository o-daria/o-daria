import { apiClient } from "../apiClient";
import type { ReportResponse } from "../types";

// MVP dev token — scoped to this service only
const AUTH_TOKEN = "ramsey-packado";

export const ReportsApiService = {
  /** GET /api/projects/:projectId/reports — all reports for a project */
  async getReports(projectId: string): Promise<ReportResponse[]> {
    const { data } = await apiClient.get<ReportResponse[]>(
      `/projects/${projectId}/reports`,
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    return data;
  },

  /** GET /api/reports/:reportId — single report by ID (used for polling) */
  async getReport(reportId: string): Promise<ReportResponse> {
    const { data } = await apiClient.get<ReportResponse>(
      `/reports/${reportId}`,
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    return data;
  },
};
