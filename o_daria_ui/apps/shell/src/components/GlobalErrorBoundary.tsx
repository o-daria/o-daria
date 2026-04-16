import { Component, type ReactNode } from "react";
import { ErrorMessage } from "@app/ui";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level catch-all error boundary (SECURITY-15).
 * Renders a generic message — never exposes stack traces to users.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Structured log — no stack trace in message, no PII
    console.error(JSON.stringify({
      level: "error",
      message: "Unhandled render error",
      componentStack: info.componentStack?.slice(0, 200),
    }));
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-screen flex-col items-center justify-center gap-4 bg-surface p-8"
          data-testid="global-error-boundary"
        >
          <ErrorMessage
            message="Something went wrong. Please refresh the page."
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
