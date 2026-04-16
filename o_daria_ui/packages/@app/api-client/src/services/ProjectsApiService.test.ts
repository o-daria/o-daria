import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { apiClient } from "../apiClient";
import { ProjectsApiService } from "./ProjectsApiService";
import type { ReportResponse } from "../types";

const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());

const reportResponse: ReportResponse = {
  report_id: "r1",
  status: "done",
  report: {
    metrics: [{ label: "Total Reach", value: 50000 }],
  },
};

describe("ProjectsApiService", () => {
  it("createProject POSTs to /reports with real contract payload", async () => {
    mock.onPost("/reports").reply(200, reportResponse);
    const result = await ProjectsApiService.createProject({
      name: "Test Brand",
      brand_input: "Bold and innovative",
      handles: ["test_brand"],
    });
    expect(result.id).toBe("r1");
    expect(result.status).toBe("REPORT_READY");
    expect(result.name).toBe("Test Brand");
    expect(result.handles).toEqual(["test_brand"]);
    expect(result.reportData).toBeDefined();
    expect(result.reportData?.metrics).toHaveLength(1);
  });

  it("createProject maps flat report object to metrics", async () => {
    mock.onPost("/reports").reply(200, {
      report_id: "r2",
      status: "done",
      report: { reach: 1000, rate: "4.5%" },
    });
    const result = await ProjectsApiService.createProject({
      name: "Flat Test",
      brand_input: "Values",
      handles: ["flat_brand"],
    });
    expect(result.reportData?.metrics.length).toBeGreaterThan(0);
  });

  it("getProjects GETs /projects", async () => {
    mock.onGet("/projects").reply(200, []);
    const result = await ProjectsApiService.getProjects();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getProject GETs /projects/:id", async () => {
    const project = {
      id: "r1",
      name: "Test Brand",
      brand_input: "Bold",
      handles: ["test_brand"],
      status: "REPORT_READY",
      ownerId: "current-user",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    mock.onGet("/projects/r1").reply(200, project);
    const result = await ProjectsApiService.getProject("r1");
    expect(result.id).toBe("r1");
  });

  it("deleteProject DELETEs /projects/:id", async () => {
    mock.onDelete("/projects/r1").reply(204);
    await expect(ProjectsApiService.deleteProject("r1")).resolves.toBeUndefined();
  });
});
