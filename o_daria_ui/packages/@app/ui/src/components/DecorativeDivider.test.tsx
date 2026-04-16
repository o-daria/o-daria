import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DecorativeDivider } from "./DecorativeDivider";

describe("DecorativeDivider", () => {
  it("renders a separator", () => {
    render(<DecorativeDivider />);
    expect(screen.getByRole("separator", { hidden: true })).toBeInTheDocument();
  });
});
