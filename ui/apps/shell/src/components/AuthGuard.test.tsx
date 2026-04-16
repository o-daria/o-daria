import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@app/auth";
import { AuthGuard } from "./AuthGuard";

function renderWithAuth(value: Partial<AuthContextValue>): void {
  const defaults: AuthContextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...defaults, ...value }}>
        <AuthGuard>
          <div>Protected</div>
        </AuthGuard>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("AuthGuard", () => {
  it("shows loading spinner while isLoading is true", () => {
    renderWithAuth({ isLoading: true });
    expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    renderWithAuth({
      isAuthenticated: true,
      user: { id: "1", email: "a@b.com", createdAt: "" },
    });
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });

  it("redirects when not authenticated and not loading", () => {
    renderWithAuth({ isAuthenticated: false, isLoading: false });
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });
});
