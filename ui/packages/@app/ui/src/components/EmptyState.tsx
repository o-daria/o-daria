import { Button } from "./Button";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-12 text-center", className)}>
      {illustration && (
        <div className="mb-2 text-gold opacity-60" aria-hidden>
          {illustration}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      {description && (
        <p className="max-w-sm font-body text-sm text-disabled">{description}</p>
      )}
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
          data-testid="empty-state-action-button"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
