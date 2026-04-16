import axios from "axios";
import type { GoogleAuthResponse } from "./types";

const BASE_URL =
  typeof import.meta !== "undefined"
    ? (import.meta.env?.VITE_API_BASE_URL ?? "")
    : "";

const authHttp = axios.create({
  baseURL: BASE_URL,
});

/**
 * Sends the Google credential (ID token) to the backend for verification and session creation.
 * Returns a session token and user profile on success.
 */
export async function loginWithGoogleCredential(
  credential: string
): Promise<GoogleAuthResponse> {
  const response = await authHttp.post<GoogleAuthResponse>("/auth/google", {
    credential,
  });
  return response.data;
}
