import { useQuery } from "@tanstack/react-query";
import { ReportsApiService } from "@app/api-client";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "done"]);

/**
 * Polls GET /api/reports/:reportId until the report reaches a terminal status.
 * Polling stops automatically when status is "COMPLETED" or "FAILED".
 */
export function useReportData(reportId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["report", reportId],
    queryFn: () => ReportsApiService.getReport(reportId!),
    enabled: enabled && reportId !== undefined,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.has(status)) return false;
      return 3000;
    },
    retry: false,
  });
}
