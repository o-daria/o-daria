declare module "mfe_reports/ReportPanel" {
  import type { ProjectStatus } from "@app/api-client";
  export interface ReportPanelProps {
    projectId: string;
    initialStatus: ProjectStatus;
  }
  const ReportPanel: React.ComponentType<ReportPanelProps>;
  export default ReportPanel;
}

declare module "mfe_canva/CanvaPanel" {
  export interface CanvaPanelProps {
    projectId: string;
    reportReady: boolean;
    existingCanvaLink?: string;
  }
  const CanvaPanel: React.ComponentType<CanvaPanelProps>;
  export default CanvaPanel;
}
