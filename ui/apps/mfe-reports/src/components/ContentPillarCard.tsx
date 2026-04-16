import type { ContentStrategyPillar } from "@app/api-client";

export function ContentPillarCard({ pillar }: { pillar: ContentStrategyPillar }): React.ReactElement {
  return (
    <div className="rounded-sm border border-gold/20 bg-surface-elevated/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-gold/10 flex items-center gap-2">
        <span className="text-gold/60 text-xs select-none" aria-hidden>❧</span>
        <h4 className="font-display text-2xl font-semibold text-ivory">{pillar.pillar}</h4>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="rounded-sm bg-gold/8 border border-gold/12 px-3 py-2.5">
          <p className="font-body text-base uppercase tracking-[0.15em] text-gold/60 mb-1.5">Example post</p>
          <p className="font-body text-2xl text-ivory/80 italic leading-relaxed">{pillar.example_post}</p>
        </div>
        <div>
          <p className="font-body text-base uppercase tracking-[0.15em] text-gold/60 mb-1.5">Why it works</p>
          <p className="font-body text-2xl text-ivory/70 leading-relaxed">{pillar.why_it_works}</p>
        </div>
      </div>
    </div>
  );
}
