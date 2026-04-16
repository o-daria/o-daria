import { cn } from "../lib/utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  decorative?: boolean;
}

export function Card({ children, className, decorative = false }: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-sm bg-card-bg p-6 shadow-card",
        decorative && "border border-card-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <h3 className={cn("font-display text-lg font-semibold text-ink", className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={cn("font-body text-sm text-ink", className)}>{children}</div>;
}
