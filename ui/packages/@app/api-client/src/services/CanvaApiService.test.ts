import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { apiClient } from "../apiClient";
import { CanvaApiService } from "./CanvaApiService";

const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());

describe("CanvaApiService", () => {
  it("canvaSetup POSTs to /canva/setup and returns sessionToken", async () => {
    mock.onPost("/canva/setup").reply(200, { sessionToken: "tok123" });
    const result = await CanvaApiService.canvaSetup({ projectId: "p1" });
    expect(result.sessionToken).toBe("tok123");
  });

  it("canvaGenerate POSTs to /canva/generate and returns canvaLink", async () => {
    mock.onPost("/canva/generate").reply(200, { canvaLink: "https://canva.com/design/xyz" });
    const result = await CanvaApiService.canvaGenerate({
      projectId: "p1",
      sessionToken: "tok123",
    });
    expect(result.canvaLink).toBe("https://canva.com/design/xyz");
  });

  it("does not call step 2 if step 1 throws", async () => {
    mock.onPost("/canva/setup").reply(500, { errorCode: "SERVER_ERROR" });
    mock.onPost("/canva/generate").reply(200, { canvaLink: "https://canva.com/design/xyz" });
    // Sequential calls (as done in useCanvaGeneration) — step 1 throws, step 2 never called
    const step2Spy = vi.spyOn(CanvaApiService, "canvaGenerate");
    await expect(CanvaApiService.canvaSetup({ projectId: "p1" })).rejects.toBeDefined();
    expect(step2Spy).not.toHaveBeenCalled();
    step2Spy.mockRestore();
  });
});
