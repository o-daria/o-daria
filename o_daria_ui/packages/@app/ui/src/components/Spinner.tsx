import { cn } from "../lib/utils";

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps): React.ReactElement {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-gold border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}
