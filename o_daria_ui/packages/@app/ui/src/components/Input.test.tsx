import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows error message and sets aria-invalid", () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows help text when no error", () => {
    render(<Input label="Email" helpText="We will never share your email" />);
    expect(screen.getByText("We will never share your email")).toBeInTheDocument();
  });

  it("does not show help text when error is present", () => {
    render(<Input label="Email" error="Required" helpText="Help" />);
    expect(screen.queryByText("Help")).not.toBeInTheDocument();
  });
});
