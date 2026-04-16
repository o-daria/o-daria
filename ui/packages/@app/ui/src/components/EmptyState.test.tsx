import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No projects yet" />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Title" description="Create your first project" />);
    expect(screen.getByText("Create your first project")).toBeInTheDocument();
  });

  it("renders action button and calls onClick", async () => {
    const onClick = vi.fn();
    render(<EmptyState title="Title" action={{ label: "New Project", onClick }} />);
    await userEvent.click(screen.getByTestId("empty-state-action-button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
