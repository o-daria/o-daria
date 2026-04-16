import { useState } from "react";
import { Badge } from "@app/ui";
import { ChevronDown, TrendingUp, Users, Tag, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@app/ui";
import type { ReportData } from "@app/api-client";
import { AudienceSegmentCard } from "./AudienceSegmentCard";
import { ContentPillarCard } from "./ContentPillarCard";
import { RiskItem } from "./RiskItem";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactElement;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}

function CollapsibleSection({ title, icon, defaultOpen = false, children, badge }: CollapsibleSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-sm border border-gold/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "group w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold",
          open ? "bg-surface-elevated/10" : "hover:bg-surface-elevated/5"
        )}
      >
        {/* Decorative left motif */}
        <span className="shrink-0 text-gold" aria-hidden>{icon}</span>

        <span className="flex-1 font-display text-2xl font-semibold text-ivory tracking-wide">{title}</span>

        {badge && (
          <span className="font-body text-sm px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 mr-1">
            {badge}
          </span>
        )}

        {/* Chinoiserie divider line */}
        <span className="hidden sm:block flex-1 max-w-[60px] h-px bg-gold/20 mx-2" aria-hidden />

        <ChevronDown
          size={14}
          className={cn("text-gold/60 shrink-0 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-5 py-4 border-t border-gold/10">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ReportDetailViewProps {
  reportData: ReportData;
  reportId: string;
  createdAt: string;
}

export function ReportDetailView({ reportData, reportId: _reportId, createdAt: _createdAt }: ReportDetailViewProps): React.ReactElement {
  const strongSegments = reportData.audience_segments.filter((s) => s.brand_fit === "strong");
  const otherSegments = reportData.audience_segments.filter((s) => s.brand_fit !== "strong");

  return (
    <div className="space-y-3" data-testid="report-data-view">

      {/* Alignment score — always visible, not collapsible */}
      <div className="flex items-start gap-4 rounded-sm border border-gold/30 bg-surface-elevated/8 px-5 py-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2 border-gold/40 bg-badge-success-bg/20 relative">
          {/* Decorative outer ring */}
          <span className="absolute inset-0 rounded-full border border-gold/15" aria-hidden />
          <TrendingUp size={16} className="text-jade-light mb-0.5" aria-hidden />
          <span className="font-display text-4xl font-bold text-jade-light leading-none">
            {reportData.alignment_score.overall}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-base font-medium text-gold/80 uppercase tracking-[0.15em] mb-1.5">
            Brand alignment score
          </p>
          <p className="font-body text-2xl text-ivory/80 leading-relaxed">
            {reportData.alignment_score.rationale}
          </p>
        </div>
      </div>

      {/* Audience segments */}
      <CollapsibleSection
        title="Audience Segments"
        icon={<Users size={15} />}
        defaultOpen
        badge={`${reportData.audience_segments.length}`}
      >
        <div className="space-y-3">
          {strongSegments.map((segment) => (
            <AudienceSegmentCard key={segment.segment_name} segment={segment} />
          ))}
          {otherSegments.map((segment) => (
            <AudienceSegmentCard key={segment.segment_name} segment={segment} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Audience topics */}
      {reportData.topics.length > 0 && (
        <CollapsibleSection
          title="Audience Topics"
          icon={<Tag size={15} />}
          badge={`${reportData.topics.length}`}
        >
          <div className="flex flex-wrap gap-2">
            {reportData.topics.map((topic) => (
              <Badge key={topic} variant="draft" label={topic} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Content strategy pillars */}
      {reportData.content_strategy_pillars.length > 0 && (
        <CollapsibleSection
          title="Content Strategy Pillars"
          icon={<Lightbulb size={15} />}
          badge={`${reportData.content_strategy_pillars.length}`}
        >
          <div className="space-y-3">
            {reportData.content_strategy_pillars.map((pillar) => (
              <ContentPillarCard key={pillar.pillar} pillar={pillar} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Risks */}
      {reportData.risks.length > 0 && (
        <CollapsibleSection
          title="Risks"
          icon={<AlertTriangle size={15} />}
          badge={`${reportData.risks.length}`}
        >
          <ul className="space-y-2">
            {reportData.risks.map((risk) => (
              <RiskItem key={risk.label} risk={risk} />
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
