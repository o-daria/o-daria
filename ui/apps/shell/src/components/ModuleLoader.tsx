import { Component, Suspense, type ReactNode } from "react";
import { ErrorMessage, Spinner } from "@app/ui";

interface ModuleLoaderProps {
  remote: string;
  children: ReactNode;
}

interface ModuleLoaderState {
  hasError: boolean;
  retryKey: number;
}

/**
 * Wraps a Module Federation remote with Suspense + ErrorBoundary.
 * Shows a spinner while loading; error message with retry on failure.
 */
export class ModuleLoader extends Component<ModuleLoaderProps, ModuleLoaderState> {
  constructor(props: ModuleLoaderProps) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(): Partial<ModuleLoaderState> {
    return { hasError: true };
  }

  componentDidCatch(): void {
    console.error(JSON.stringify({ level: "error", message: "Module load failed", remote: this.props.remote }));
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({ hasError: false, retryKey: prev.retryKey + 1 }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8" data-testid="module-loader-error">
          <ErrorMessage message="Failed to load module. Please try again." onRetry={this.handleRetry} />
        </div>
      );
    }

    return (
      <Suspense
        key={this.state.retryKey}
        fallback={
          <div className="flex h-64 items-center justify-center" data-testid="module-loader-loading">
            <Spinner size="lg" />
          </div>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}
