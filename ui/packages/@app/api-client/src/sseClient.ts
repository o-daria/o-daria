import type { ProjectStatus } from "./types";

export interface SSEOptions {
  projectId: string;
  onStatusChange: (status: ProjectStatus) => void;
  onError: (event: Event) => void;
}

const TERMINAL_STATUSES: ReadonlySet<ProjectStatus> = new Set([
  "REPORT_READY",
  "PRESENTATION_READY",
]);

/**
 * Opens an SSE connection to the project status stream.
 * The caller is responsible for calling source.close() on component unmount.
 */
export function createProjectStatusSSE(options: SSEOptions): EventSource {
  const { projectId, onStatusChange, onError } = options;
  const baseUrl =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_API_BASE_URL ?? "")
      : "";

  const source = new EventSource(
    `${baseUrl}/projects/${projectId}/status-stream`,
    { withCredentials: true }
  );

  source.onmessage = (event: MessageEvent<string>) => {
    const status = event.data as ProjectStatus;
    onStatusChange(status);
    if (TERMINAL_STATUSES.has(status)) {
      source.close();
    }
  };

  source.onerror = (event) => {
    onError(event);
    source.close();
  };

  return source;
}
