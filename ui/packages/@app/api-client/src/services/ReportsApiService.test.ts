import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { apiClient } from "../apiClient";
import { ReportsApiService } from "./ReportsApiService";
import type { ReportData } from "../types";

const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());

const reportData: ReportData = {
  projectId: "p1",
  generatedAt: "2026-01-01T00:00:00Z",
  metrics: [{ label: "Reach", value: 5000 }],
};

describe("ReportsApiService", () => {
  it("getReportStatus returns status", async () => {
    mock.onGet("/projects/p1/status").reply(200, { status: "REPORT_READY" });
    const status = await ReportsApiService.getReportStatus("p1");
    expect(status).toBe("REPORT_READY");
  });

  it("getReportData returns report", async () => {
    mock.onGet("/projects/p1/report").reply(200, reportData);
    const result = await ReportsApiService.getReportData("p1");
    expect(result.metrics).toHaveLength(1);
  });
});
