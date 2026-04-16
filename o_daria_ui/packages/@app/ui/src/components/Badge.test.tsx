import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders label", () => {
    render(<Badge label="Processing" variant="processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders all status variants without errors", () => {
    const variants = ["draft", "processing", "report-ready", "presentation-ready", "error"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge label={variant} variant={variant} />);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    }
  });
});
