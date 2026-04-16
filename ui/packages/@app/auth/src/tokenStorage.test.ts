import { afterEach, describe, expect, it } from "vitest";
import { tokenStorage } from "./tokenStorage";
import type { User } from "./types";

const mockUser: User = { id: "u1", email: "a@b.com", createdAt: "2026-01-01T00:00:00Z" };

afterEach(() => localStorage.clear());

describe("tokenStorage", () => {
  it("returns null when nothing stored", () => {
    expect(tokenStorage.getUser()).toBeNull();
  });

  it("stores and retrieves a user", () => {
    tokenStorage.setUser(mockUser);
    expect(tokenStorage.getUser()).toEqual(mockUser);
  });

  it("clears the stored user", () => {
    tokenStorage.setUser(mockUser);
    tokenStorage.clearUser();
    expect(tokenStorage.getUser()).toBeNull();
  });

  it("returns null and clears on malformed JSON", () => {
    localStorage.setItem("app.user", "not-json{");
    expect(tokenStorage.getUser()).toBeNull();
    expect(localStorage.getItem("app.user")).toBeNull();
  });

  it("returns null on object missing required fields", () => {
    localStorage.setItem("app.user", JSON.stringify({ id: "1" }));
    expect(tokenStorage.getUser()).toBeNull();
  });
});
