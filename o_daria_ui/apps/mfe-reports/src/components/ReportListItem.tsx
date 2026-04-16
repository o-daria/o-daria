import { cn } from "@app/ui";
import type { ReportResponse } from "@app/api-client";
import { CheckCircle2, Clock, AlertCircle, Loader2, TrendingUp, CalendarDays } from "lucide-react";

interface ReportListItemProps {
  report: ReportResponse;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const statusConfig = {
  COMPLETED: {
    icon: <CheckCircle2 size={14} aria-hidden />,
    label: "Completed",
    color: "text-jade",
    dotColor: "bg-jade",
  },
  FAILED: {
    icon: <AlertCircle size={14} aria-hidden />,
    label: "Failed",
    color: "text-error",
    dotColor: "bg-error",
  },
  PENDING: {
    icon: <Clock size={14} aria-hidden />,
    label: "Pending",
    color: "text-gold",
    dotColor: "bg-gold",
  },
  PROCESSING: {
    icon: <Loader2 size={14} className="animate-spin" aria-hidden />,
    label: "Processing",
    color: "text-porcelain",
    dotColor: "bg-porcelain",
  },
} as const;

function getStatusConfig(status: string) {
  return statusConfig[status as keyof typeof statusConfig] ?? statusConfig.PENDING;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ReportListItem({ report, index, isSelected, onSelect }: ReportListItemProps): React.ReactElement {
  const cfg = getStatusConfig(report.status);
  const alignmentScore = report.report?.alignment_score?.overall;
  const date = formatDate(report.created_at);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "group w-full text-left transition-all duration-200 rounded-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        "relative overflow-hidden",
        isSelected
          ? "border-gold bg-surface-elevated shadow-[0_0_0_1px_rgba(201,168,76,0.4),0_4px_16px_rgba(201,168,76,0.15)]"
          : "border-card-border/40 bg-card-bg/5 hover:border-gold/50 hover:bg-card-bg/10"
      )}
    >
      {/* Chinoiserie corner motif */}
      <span
        className={cn(
          "absolute top-1.5 right-2 font-display text-base select-none transition-opacity duration-200",
          isSelected ? "text-gold/60 opacity-100" : "text-gold/20 opacity-0 group-hover:opacity-100"
        )}
        aria-hidden
      >
        ❧
      </span>

      <div className="px-4 py-3.5 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className={cn("font-body text-base font-medium tracking-widest uppercase shrink-0", isSelected ? "text-gold" : "text-disabled")}>
            #{String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 min-w-0" />
          <span className={cn("flex items-center gap-1 font-body text-lg", cfg.color)}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-disabled shrink-0" aria-hidden />
          <span className="font-body text-lg text-disabled">{date}</span>
        </div>

        {/* Alignment score pill — only when completed */}
        {alignmentScore !== undefined && (
          <div className={cn(
            "flex items-center gap-2 mt-1 rounded-full px-3 py-1 w-fit",
            isSelected ? "bg-badge-success-bg" : "bg-surface-elevated"
          )}>
            <TrendingUp size={12} className="text-jade shrink-0" aria-hidden />
            <span className="font-display text-2xl font-semibold text-jade leading-none">
              {alignmentScore}
            </span>
            <span className="font-body text-base text-jade-dark/70 leading-none">alignment</span>
          </div>
        )}
      </div>

      {/* Selected indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold rounded-l-sm" aria-hidden />
      )}
    </button>
  );
}
