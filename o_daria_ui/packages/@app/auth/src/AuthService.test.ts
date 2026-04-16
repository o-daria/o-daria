import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./AuthService";

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn(),
      })),
    },
  };
});

describe("AuthService (interface contract)", () => {
  it("exports login, register, logout, requestPasswordReset, resetPassword, validateToken", () => {
    expect(typeof AuthService.login).toBe("function");
    expect(typeof AuthService.register).toBe("function");
    expect(typeof AuthService.logout).toBe("function");
    expect(typeof AuthService.requestPasswordReset).toBe("function");
    expect(typeof AuthService.resetPassword).toBe("function");
    expect(typeof AuthService.validateToken).toBe("function");
  });
});
