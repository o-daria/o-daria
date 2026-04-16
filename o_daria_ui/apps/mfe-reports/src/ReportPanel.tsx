import { useState } from "react";
import { ErrorMessage, Spinner } from "@app/ui";
import { Clock, FileText } from "lucide-react";
import type { ProjectStatus, ReportData } from "@app/api-client";
import { ReportListItem } from "./components/ReportListItem";
import { ReportDetailView } from "./components/ReportDetailView";
import { useProjectReports } from "./hooks/useProjectReports";
import { useReportData } from "./hooks/useReportData";

export interface ReportPanelProps {
  projectId: string;
  initialStatus: ProjectStatus;
}

export default function ReportPanel({ projectId, initialStatus }: ReportPanelProps): React.ReactElement {
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);

  const {
    data: reports,
    isLoading: reportsLoading,
    error: reportsError,
    refetch: refetchReports,
  } = useProjectReports(projectId);

  // Sort reports newest-first
  const sortedReports = reports
    ? [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  // Auto-select the first report when list loads (if nothing selected yet)
  const effectiveSelectedId = selectedReportId ?? sortedReports[0]?.report_id;

  const selectedReport = sortedReports.find((r) => r.report_id === effectiveSelectedId);

  const isTerminal = selectedReport?.status === "COMPLETED" || selectedReport?.status === "FAILED" || selectedReport?.status === "done";
  const pollingEnabled = selectedReport !== undefined && !isTerminal;

  const {
    data: polledReport,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useReportData(effectiveSelectedId, pollingEnabled);

  const activeReport = polledReport ?? selectedReport;

  // ── Loading / error states ────────────────────────────────────────────────

  if (reportsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  if (reportsError) {
    return (
      <ErrorMessage
        message="Failed to load reports."
        onRetry={() => void refetchReports()}
        data-testid="report-error-state"
      />
    );
  }

  if (sortedReports.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-sm border border-gold/20 bg-surface-elevated/5 px-5 py-4"
        data-testid="report-draft-state"
      >
        <Clock size={16} className="text-gold/60 shrink-0" aria-hidden />
        <div>
          <p className="font-body text-2xl text-ivory/70">
            {initialStatus === "DRAFT"
              ? "Upload profile images to start audience analysis."
              : "No reports available yet."}
          </p>
        </div>
      </div>
    );
  }

  // ── Resolve report data from activeReport ─────────────────────────────────
  // report field is a Report object (not JSON string) per updated types
  const reportData: ReportData | undefined = (() => {
    const raw = activeReport?.report;
    if (!raw) return undefined;
    // Handle both: already-parsed object and legacy JSON string
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as ReportData; } catch { return undefined; }
    }
    return raw as unknown as ReportData;
  })();

  // ── Two-column layout ─────────────────────────────────────────────────────

  return (
    <div className="flex gap-4 min-h-0" data-testid="report-panel">

      {/* Left — report list */}
      <div className="w-80 shrink-0 flex flex-col gap-2" data-testid="report-list">
        {/* Section label */}
        <div className="flex items-center gap-2 px-1 mb-1">
          <FileText size={12} className="text-gold/60" aria-hidden />
          <span className="font-body text-base uppercase tracking-[0.18em] text-gold/60">
            Reports
          </span>
          <span className="ml-auto font-body text-base text-disabled">
            {sortedReports.length}
          </span>
        </div>

        {sortedReports.map((report, index) => (
          <ReportListItem
            key={report.report_id}
            report={report}
            index={index}
            isSelected={report.report_id === effectiveSelectedId}
            onSelect={() => setSelectedReportId(report.report_id)}
          />
        ))}
      </div>

      {/* Vertical Chinoiserie divider */}
      <div className="relative w-px self-stretch bg-gold/15 shrink-0 mx-1" aria-hidden>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold/30 text-lg select-none">✦</span>
      </div>

      {/* Right — report detail */}
      <div className="flex-1 min-w-0" data-testid="report-detail">
        {activeReport?.status === "PENDING" || activeReport?.status === "PROCESSING" ? (
          <div
            className="flex items-center gap-3 rounded-sm border border-gold/20 bg-surface-elevated/5 px-5 py-4"
            data-testid="report-processing-state"
          >
            <Spinner size="sm" />
            <span className="font-body text-2xl text-ivory/70">Analyzing audience data…</span>
          </div>
        ) : activeReport?.status === "FAILED" ? (
          <ErrorMessage
            message={activeReport.error ?? "Analysis failed. Please try again."}
            onRetry={() => void refetchReports()}
            data-testid="report-error-state"
          />
        ) : reportLoading ? (
          <div className="flex justify-center py-12"><Spinner size="md" /></div>
        ) : reportError ? (
          <ErrorMessage
            message="Failed to load the report."
            onRetry={() => void refetchReport()}
            data-testid="report-error-state"
          />
        ) : reportData ? (
          <ReportDetailView
            reportData={reportData}
            reportId={activeReport?.report_id ?? ""}
            createdAt={activeReport?.created_at ?? ""}
          />
        ) : (
          <div
            className="flex items-center gap-3 rounded-sm border border-gold/20 bg-surface-elevated/5 px-5 py-4"
            data-testid="report-draft-state"
          >
            <Clock size={16} className="text-gold/60 shrink-0" aria-hidden />
            <p className="font-body text-2xl text-ivory/70">Report data is not yet available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
