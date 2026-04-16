import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@app/auth";
import { GlobalLayout } from "./GlobalLayout";

const mockAuth: AuthContextValue = {
  user: { id: "1", email: "a@b.com", createdAt: "" },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

describe("GlobalLayout", () => {
  it("renders children inside main", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuth}>
          <GlobalLayout>
            <div>Page content</div>
          </GlobalLayout>
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
