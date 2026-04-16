import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SidebarNav } from "./SidebarNav";

describe("SidebarNav", () => {
  it("renders Projects link", () => {
    render(
      <MemoryRouter>
        <SidebarNav collapsed={false} />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
  });

  it("hides labels when collapsed", () => {
    render(
      <MemoryRouter>
        <SidebarNav collapsed />
      </MemoryRouter>
    );
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  it("shows active aria-current on matching route", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <SidebarNav collapsed={false} />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
