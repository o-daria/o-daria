import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error("Test error");
  return <div>Normal content</div>;
}

describe("GlobalErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    // Suppress console.error for this test
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <GlobalErrorBoundary>
        <ThrowingChild shouldThrow />
      </GlobalErrorBoundary>
    );
    expect(screen.getByTestId("global-error-boundary")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
