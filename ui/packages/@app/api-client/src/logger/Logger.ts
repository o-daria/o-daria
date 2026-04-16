import type { LogLevel, LogTransport } from "./types";

export class Logger {
  readonly correlationId: string;

  constructor(
    private readonly transport: LogTransport,
    correlationId?: string
  ) {
    // One correlation ID per browser session
    this.correlationId =
      correlationId ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2));
  }

  private write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.transport.log({
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      message,
      ...(context ? { context } : {}),
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write("error", message, context);
  }
}
