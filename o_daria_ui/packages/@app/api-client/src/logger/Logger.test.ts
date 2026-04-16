import { describe, expect, it, vi } from "vitest";
import { Logger } from "./Logger";
import type { LogEntry, LogTransport } from "./types";

function makeTransport(): { transport: LogTransport; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const transport: LogTransport = { log: (e) => entries.push(e) };
  return { transport, entries };
}

describe("Logger", () => {
  it("logs info with correct fields", () => {
    const { transport, entries } = makeTransport();
    const logger = new Logger(transport, "test-correlation-id");
    logger.info("hello", { key: "value" });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: "info",
      correlationId: "test-correlation-id",
      message: "hello",
      context: { key: "value" },
    });
    expect(entries[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("logs warn", () => {
    const { transport, entries } = makeTransport();
    const logger = new Logger(transport, "cid");
    logger.warn("warning");
    expect(entries[0]?.level).toBe("warn");
  });

  it("logs error", () => {
    const { transport, entries } = makeTransport();
    const logger = new Logger(transport, "cid");
    logger.error("something failed");
    expect(entries[0]?.level).toBe("error");
  });

  it("omits context field when not provided", () => {
    const { transport, entries } = makeTransport();
    const logger = new Logger(transport, "cid");
    logger.info("no context");
    expect(entries[0]).not.toHaveProperty("context");
  });

  it("generates a correlation ID if not provided", () => {
    const { transport } = makeTransport();
    const logger = new Logger(transport);
    expect(logger.correlationId).toBeTruthy();
    expect(typeof logger.correlationId).toBe("string");
  });
});
