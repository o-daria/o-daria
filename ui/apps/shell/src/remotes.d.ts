// Type declarations for Webpack Module Federation remotes.
// These modules are resolved at runtime — TypeScript only needs to know their shape.

declare module "mfe_auth/Module" {
  const Module: React.ComponentType;
  export default Module;
}

declare module "mfe_projects/Module" {
  const Module: React.ComponentType;
  export default Module;
}

declare module "mfe_reports/ReportPanel" {
  import type { ReportPanelProps } from "../../../mfe-reports/src/ReportPanel";
  const ReportPanel: React.ComponentType<ReportPanelProps>;
  export default ReportPanel;
  export type { ReportPanelProps };
}

declare module "mfe_canva/CanvaPanel" {
  import type { CanvaPanelProps } from "../../../mfe-canva/src/CanvaPanel";
  const CanvaPanel: React.ComponentType<CanvaPanelProps>;
  export default CanvaPanel;
  export type { CanvaPanelProps };
}
