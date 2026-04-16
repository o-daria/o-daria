import { cn } from "../lib/utils";

export interface DecorativeDividerProps {
  className?: string;
}

export function DecorativeDivider({ className }: DecorativeDividerProps): React.ReactElement {
  return (
    <div
      role="separator"
      aria-hidden
      className={cn("relative my-6 flex items-center", className)}
    >
      <div className="h-px flex-1 bg-gold/30" />
      <span className="mx-3 font-display text-gold/60 text-lg select-none">✦</span>
      <div className="h-px flex-1 bg-gold/30" />
    </div>
  );
}
