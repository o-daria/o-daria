import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { withAuthGuard } from "./withAuthGuard";

function Protected(): React.ReactElement {
  return <div>Protected Content</div>;
}

const GuardedProtected = withAuthGuard(Protected);

function renderWithAuth(value: Partial<AuthContextValue>, ui: React.ReactElement): void {
  const defaultValue: AuthContextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  render(
    <AuthContext.Provider value={{ ...defaultValue, ...value }}>
      {ui}
    </AuthContext.Provider>
  );
}

describe("withAuthGuard", () => {
  it("renders wrapped component when authenticated", () => {
    renderWithAuth(
      { isAuthenticated: true, user: { id: "1", email: "a@b.com", createdAt: "" } },
      <GuardedProtected />
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    renderWithAuth({ isLoading: true }, <GuardedProtected />);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders nothing and redirects when unauthenticated", () => {
    const replaceSpy = vi.spyOn(window.location, "replace").mockImplementation(() => undefined);
    renderWithAuth({ isAuthenticated: false }, <GuardedProtected />);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(replaceSpy).toHaveBeenCalledWith("/auth/login");
    replaceSpy.mockRestore();
  });
});
