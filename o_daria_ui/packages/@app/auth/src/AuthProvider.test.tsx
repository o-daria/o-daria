import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { tokenStorage } from "./tokenStorage";
import type { User } from "./types";

vi.mock("./AuthService", () => ({
  AuthService: {
    login: vi.fn().mockResolvedValue({ user: { id: "1", email: "a@b.com", createdAt: "2026-01-01" } }),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockUser: User = { id: "1", email: "a@b.com", createdAt: "2026-01-01" };

function TestConsumer(): React.ReactElement {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <button onClick={() => void logout()}>Logout</button>
    </div>
  );
}

afterEach(() => localStorage.clear());

describe("AuthProvider", () => {
  it("starts loading then resolves unauthenticated when no stored user", async () => {
    render(
      <AuthProvider navigate={vi.fn()}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );
    expect(screen.getByTestId("auth")).toHaveTextContent("false");
    expect(screen.getByTestId("email")).toHaveTextContent("none");
  });

  it("restores user from localStorage on mount (BR-AUTH-01)", async () => {
    tokenStorage.setUser(mockUser);
    render(
      <AuthProvider navigate={vi.fn()}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );
    expect(screen.getByTestId("auth")).toHaveTextContent("true");
    expect(screen.getByTestId("email")).toHaveTextContent("a@b.com");
  });

  it("clears user and navigates to login on logout (BR-AUTH-03)", async () => {
    const navigate = vi.fn();
    tokenStorage.setUser(mockUser);
    render(
      <AuthProvider navigate={navigate}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("false")
    );
    expect(tokenStorage.getUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith("/auth/login");
  });
});
