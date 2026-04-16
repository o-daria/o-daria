import { Badge } from "@app/ui";
import type { ProjectStatus } from "@app/api-client";

const STATUS_MAP: Record<ProjectStatus, { variant: "draft" | "processing" | "report-ready" | "presentation-ready" | "error"; label: string }> = {
  DRAFT: { variant: "draft", label: "Draft" },
  PROCESSING: { variant: "processing", label: "Processing" },
  REPORT_READY: { variant: "report-ready", label: "Report Ready" },
  PRESENTATION_READY: { variant: "presentation-ready", label: "Presentation Ready" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }): React.ReactElement {
  const { variant, label } = STATUS_MAP[status];
  return <Badge variant={variant} label={label} />;
}
