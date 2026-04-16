import axios, { type AxiosError, type AxiosInstance } from "axios";
import { ApiError } from "./ApiError";
import { logger } from "./logger";

const BASE_URL = typeof import.meta !== "undefined"
  ? (import.meta.env?.VITE_API_BASE_URL ?? "/api")
  : "";

function extractApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const errorCode =
    (typeof data?.errorCode === "string" ? data.errorCode : undefined) ??
    (typeof data?.code === "string" ? data.code : undefined) ??
    "UNKNOWN_ERROR";
  const message = "Something went wrong. Please try again.";
  return new ApiError(status, errorCode, message);
}

let onUnauthorized: (() => void) | null = null;

/** Register a callback that fires when any request returns 401. */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30_000,
});

// Request interceptor — attach correlation ID header; never log auth data
apiClient.interceptors.request.use((config) => {
  config.headers["X-Correlation-ID"] = logger.correlationId;
  logger.info("API request", { method: config.method?.toUpperCase(), url: config.url });
  return config;
});

// Response interceptor — normalize errors; handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const apiError = extractApiError(error);
      logger.error("API error", { statusCode: apiError.statusCode, errorCode: apiError.errorCode });

      if (apiError.isUnauthorized() && onUnauthorized) {
        onUnauthorized();
      }

      return Promise.reject(apiError);
    }
    return Promise.reject(error);
  }
);
