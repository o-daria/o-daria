import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@app/auth";
import { Sidebar } from "./Sidebar";

const mockAuth: AuthContextValue = {
  user: { id: "1", email: "alex@agency.com", createdAt: "" },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

function renderSidebar(): void {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuth}>
        <Sidebar />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

afterEach(() => localStorage.clear());

describe("Sidebar", () => {
  it("renders navigation landmark", () => {
    renderSidebar();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("shows Projects nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
  });

  it("shows user email", () => {
    renderSidebar();
    expect(screen.getByText("alex@agency.com")).toBeInTheDocument();
  });

  it("toggles collapse state and persists to localStorage", async () => {
    renderSidebar();
    const toggle = screen.getByTestId("sidebar-toggle");
    await userEvent.click(toggle);
    expect(localStorage.getItem("app.sidebarCollapsed")).toBe("true");
  });

  it("calls logout on logout button click (US-AUTH-03)", async () => {
    renderSidebar();
    await userEvent.click(screen.getByTestId("sidebar-logout-button"));
    expect(mockAuth.logout).toHaveBeenCalledOnce();
  });
});
