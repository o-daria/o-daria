import type { LogEntry, LogTransport } from "./types";

export class ConsoleTransport implements LogTransport {
  log(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    switch (entry.level) {
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }
}
