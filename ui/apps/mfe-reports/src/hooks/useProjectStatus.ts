import { useEffect, useState } from "react";
import { createProjectStatusSSE } from "@app/api-client";
import type { ProjectStatus } from "@app/api-client";

export function useProjectStatusSSE(projectId: string, initialStatus: ProjectStatus) {
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [sseError, setSseError] = useState<string | null>(null);

  const isTerminal = status === "REPORT_READY" || status === "PRESENTATION_READY";

  useEffect(() => {
    if (isTerminal) return;

    let source: EventSource | null = null;
    try {
      source = createProjectStatusSSE({
        projectId,
        onStatusChange: (s) => { setStatus(s); setSseError(null); },
        onError: () => setSseError("Status connection lost. Refresh to check progress."),
      });
    } catch {
      // SSE not supported or backend unavailable — silently degrade
    }

    return () => source?.close();
  }, [projectId, isTerminal]);

  return { status, sseError };
}
