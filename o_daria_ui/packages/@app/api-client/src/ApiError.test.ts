import { describe, expect, it } from "vitest";
import { ApiError } from "./ApiError";

describe("ApiError", () => {
  it("stores statusCode, errorCode, and message", () => {
    const err = new ApiError(404, "NOT_FOUND", "Resource not found");
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("is instanceof ApiError and Error", () => {
    const err = new ApiError(500, "SERVER_ERROR", "Internal error");
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
  });

  it("isUnauthorized returns true for 401", () => {
    expect(new ApiError(401, "UNAUTHORIZED", "").isUnauthorized()).toBe(true);
  });

  it("isForbidden returns true for 403", () => {
    expect(new ApiError(403, "FORBIDDEN", "").isForbidden()).toBe(true);
  });

  it("isNotFound returns true for 404", () => {
    expect(new ApiError(404, "NOT_FOUND", "").isNotFound()).toBe(true);
  });

  it("isServerError returns true for 500+", () => {
    expect(new ApiError(500, "SERVER_ERROR", "").isServerError()).toBe(true);
    expect(new ApiError(503, "UNAVAILABLE", "").isServerError()).toBe(true);
  });

  it("isServerError returns false for 4xx", () => {
    expect(new ApiError(400, "BAD_REQUEST", "").isServerError()).toBe(false);
  });
});
