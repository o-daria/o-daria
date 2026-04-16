import { ConsoleTransport } from "./ConsoleTransport";
import { Logger } from "./Logger";

export { Logger } from "./Logger";
export { ConsoleTransport } from "./ConsoleTransport";
export type { LogEntry, LogLevel, LogTransport } from "./types";

// Singleton logger for the application — Phase 1: console transport
export const logger = new Logger(new ConsoleTransport());
