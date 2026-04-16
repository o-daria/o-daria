import { apiClient } from "../apiClient";
import type {
  CanvaGenerateRequest,
  CanvaGenerateResponse,
  CanvaSetupRequest,
  CanvaSetupResponse,
} from "../types";

export const CanvaApiService = {
  /** Step 1 of two-step Canva generation flow */
  async canvaSetup(payload: CanvaSetupRequest): Promise<CanvaSetupResponse> {
    const { data } = await apiClient.post<CanvaSetupResponse>(
      "/canva/setup",
      payload
    );
    return data;
  },

  /** Step 2 of two-step Canva generation flow */
  async canvaGenerate(
    payload: CanvaGenerateRequest
  ): Promise<CanvaGenerateResponse> {
    const { data } = await apiClient.post<CanvaGenerateResponse>(
      "/canva/generate",
      payload
    );
    return data;
  },
};
