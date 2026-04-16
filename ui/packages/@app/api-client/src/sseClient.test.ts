import { describe, expect, it, vi } from "vitest";
import { createProjectStatusSSE } from "./sseClient";
import type { ProjectStatus } from "./types";

// Mock EventSource
class MockEventSource {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly url: string;
  readonly withCredentials: boolean;
  closed = false;

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
  }

  close(): void {
    this.closed = true;
  }

  // Test helper: simulate a server message
  simulateMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  simulateError(): void {
    this.onerror?.(new Event("error"));
  }
}

vi.stubGlobal("EventSource", MockEventSource);

describe("createProjectStatusSSE", () => {
  it("calls onStatusChange with received status", () => {
    const onStatusChange = vi.fn();
    const source = createProjectStatusSSE({
      projectId: "p1",
      onStatusChange,
      onError: vi.fn(),
    }) as unknown as MockEventSource;

    source.simulateMessage("PROCESSING");
    expect(onStatusChange).toHaveBeenCalledWith("PROCESSING");
  });

  it("closes connection on terminal status REPORT_READY", () => {
    const source = createProjectStatusSSE({
      projectId: "p1",
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    }) as unknown as MockEventSource;

    source.simulateMessage("REPORT_READY");
    expect(source.closed).toBe(true);
  });

  it("closes and calls onError on error", () => {
    const onError = vi.fn();
    const source = createProjectStatusSSE({
      projectId: "p1",
      onStatusChange: vi.fn(),
      onError,
    }) as unknown as MockEventSource;

    source.simulateError();
    expect(onError).toHaveBeenCalledOnce();
    expect(source.closed).toBe(true);
  });
});
