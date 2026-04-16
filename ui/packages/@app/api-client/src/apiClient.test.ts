import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./ApiError";
import { apiClient, registerUnauthorizedHandler } from "./apiClient";

const mock = new MockAdapter(apiClient);

afterEach(() => mock.reset());

describe("apiClient", () => {
  it("returns response data on success", async () => {
    mock.onGet("/test").reply(200, { ok: true });
    const response = await apiClient.get<{ ok: boolean }>("/test");
    expect(response.data).toEqual({ ok: true });
  });

  it("throws ApiError on non-2xx response", async () => {
    mock.onGet("/fail").reply(404, { errorCode: "NOT_FOUND" });
    await expect(apiClient.get("/fail")).rejects.toBeInstanceOf(ApiError);
  });

  it("sets statusCode correctly on ApiError", async () => {
    mock.onGet("/server-error").reply(500, { errorCode: "SERVER_ERROR" });
    try {
      await apiClient.get("/server-error");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(500);
    }
  });

  it("calls onUnauthorized handler on 401", async () => {
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);
    mock.onGet("/protected").reply(401, { errorCode: "UNAUTHORIZED" });
    await expect(apiClient.get("/protected")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });
});
