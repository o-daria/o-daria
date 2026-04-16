import { AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../lib/utils";

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps): React.ReactElement {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-sm border border-error/30 bg-red-50 p-4 text-center",
        className
      )}
    >
      <AlertCircle className="text-error" size={20} aria-hidden />
      <p className="font-body text-sm text-ink">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          data-testid="error-retry-button"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
