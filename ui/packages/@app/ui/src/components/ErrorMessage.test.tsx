import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorMessage } from "./ErrorMessage";

describe("ErrorMessage", () => {
  it("renders the message", () => {
    render(<ErrorMessage message="Something went wrong." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("shows retry button when onRetry provided", () => {
    render(<ErrorMessage message="Error" onRetry={vi.fn()} />);
    expect(screen.getByTestId("error-retry-button")).toBeInTheDocument();
  });

  it("calls onRetry when retry button clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message="Error" onRetry={onRetry} />);
    await userEvent.click(screen.getByTestId("error-retry-button"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not show retry button when onRetry not provided", () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.queryByTestId("error-retry-button")).not.toBeInTheDocument();
  });
});
