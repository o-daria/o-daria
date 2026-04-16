import { useState } from "react";
import { Badge } from "@app/ui";
import { ChevronDown, Users } from "lucide-react";
import { cn } from "@app/ui";
import type { AudienceSegment } from "@app/api-client";

const brandFitVariant = {
  strong: "report-ready" as const,
  moderate: "processing" as const,
  weak: "draft" as const,
};

const brandFitLabel = {
  strong: "Strong fit",
  moderate: "Moderate fit",
  weak: "Weak fit",
};

const brandFitAccent: Record<string, string> = {
  strong: "border-l-jade",
  moderate: "border-l-porcelain",
  weak: "border-l-disabled",
};

export function AudienceSegmentCard({ segment }: { segment: AudienceSegment }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const fit = (segment.brand_fit as keyof typeof brandFitVariant) in brandFitVariant
    ? (segment.brand_fit as keyof typeof brandFitVariant)
    : "weak";

  return (
    <div
      className={cn(
        "rounded-sm border border-gold/20 bg-surface-elevated/5 overflow-hidden",
        "border-l-2",
        brandFitAccent[fit] ?? "border-l-disabled"
      )}
    >
      {/* Header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="group w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold hover:bg-surface-elevated/5 transition-colors"
      >
        <Users size={14} className="shrink-0 text-gold/50" aria-hidden />
        <span className="flex-1 font-display text-2xl font-semibold text-ivory leading-snug">
          {segment.segment_name}
        </span>
        <Badge variant={brandFitVariant[fit]} label={brandFitLabel[fit]} />
        <ChevronDown
          size={14}
          className={cn("text-gold/40 shrink-0 transition-transform duration-200 ml-1", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {/* Collapsed summary — size estimate as a teaser */}
      {!expanded && (
        <div className="px-4 pb-3">
          <p className="font-body text-lg text-disabled/80 line-clamp-1">{segment.size_estimate}</p>
        </div>
      )}

      {/* Expanded body */}
      <div className={cn("transition-all duration-300 overflow-hidden", expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="px-4 pb-4 border-t border-gold/10 pt-3 space-y-3">

          {/* Size estimate */}
          <div className="flex items-center gap-1.5">
            <span className="font-body text-base uppercase tracking-[0.15em] text-gold/60">Estimated size</span>
            <span className="flex-1 h-px bg-gold/10" aria-hidden />
            <span className="font-body text-lg text-ivory/60">{segment.size_estimate}</span>
          </div>

          {/* Defining traits */}
          {segment.defining_traits.length > 0 && (
            <div>
              <p className="font-body text-base uppercase tracking-[0.15em] text-gold/60 mb-2">Defining traits</p>
              <ul className="space-y-1.5">
                {segment.defining_traits.map((trait) => (
                  <li key={trait} className="flex gap-2.5 font-body text-2xl text-ivory/80">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-jade-light" aria-hidden />
                    {trait}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content direction */}
          <div className="rounded-sm bg-gold/8 border border-gold/15 px-3 py-2.5">
            <p className="font-body text-base uppercase tracking-[0.15em] text-gold/70 mb-1">Content direction</p>
            <p className="font-body text-2xl text-ivory/80 leading-relaxed">{segment.content_direction}</p>
          </div>

          {/* Segment star */}
          {segment.segment_star && (
            <div className="flex items-start gap-2 pt-1">
              <span className="text-gold text-sm select-none shrink-0 mt-0.5" aria-hidden>✦</span>
              <p className="font-body text-lg text-ivory/60 italic">{segment.segment_star}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
