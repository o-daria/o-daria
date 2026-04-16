export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface LogTransport {
  log(entry: LogEntry): void;
}
