import { cn } from "@app/ui";

export function SidebarLogo({ collapsed }: { collapsed: boolean }): React.ReactElement {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-5 border-b border-ink/20 relative overflow-hidden",
      collapsed && "justify-center px-0"
    )}>
      {/* Chinoiserie peony/botanical motif */}
      <div className="relative shrink-0 flex items-center justify-center">
        <span className="text-ink text-2xl select-none leading-none" aria-hidden>✿</span>
        <span className="absolute text-ink/15 text-4xl select-none leading-none scale-125" aria-hidden>✿</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-display text-xl font-bold text-ink tracking-widest leading-tight">
            o_daria
          </span>
          <span className="font-body text-xs tracking-[0.2em] text-ink/60 uppercase">
            audience analysis
          </span>
        </div>
      )}
    </div>
  );
}
