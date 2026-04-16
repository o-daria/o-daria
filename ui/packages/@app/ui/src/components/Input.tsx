import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const helpId = helpText ? `${inputId}-help` : undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="font-body text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={[errorId, helpId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-10 w-full rounded-sm border bg-card-bg px-3 font-body text-sm text-ink",
            "placeholder:text-disabled",
            "focus:outline-none focus:ring-2 focus:ring-input-focus-border focus:border-input-focus-border",
            error
              ? "border-error focus:ring-error"
              : "border-input-border",
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="font-body text-xs text-error">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={helpId} className="font-body text-xs text-disabled">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
