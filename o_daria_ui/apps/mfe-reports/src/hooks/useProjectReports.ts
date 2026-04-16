import { useQuery } from "@tanstack/react-query";
import { ReportsApiService } from "@app/api-client";

/**
 * Fetches all reports for a project from GET /api/projects/:projectId/reports.
 * Returns the raw query — consumer is responsible for picking the latest.
 */
export function useProjectReports(projectId: string) {
  return useQuery({
    queryKey: ["reports", projectId],
    queryFn: () => ReportsApiService.getReports(projectId),
    enabled: projectId !== "",
  });
}
