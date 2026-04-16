import axios from "axios";
import type {
  GoogleAuthResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  User,
} from "./types";
import { loginWithGoogleCredential } from "./googleAuthService";

const BASE_URL = typeof import.meta !== "undefined"
  ? (import.meta.env?.VITE_API_BASE_URL ?? "")
  : "";

const authHttp = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

async function loginWithGoogle(credential: string): Promise<GoogleAuthResponse> {
  return loginWithGoogleCredential(credential);
}

/** @deprecated Use loginWithGoogle() instead. Will be removed in a future release. */
async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await authHttp.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

/** @deprecated Google Sign-In is the only supported registration path. Will be removed in a future release. */
async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await authHttp.post<RegisterResponse>("/auth/register", payload);
  return response.data;
}

/** @deprecated Session is managed client-side. Will be removed in a future release. */
async function logout(): Promise<void> {
  await authHttp.post("/auth/logout");
}

/** @deprecated Password reset is no longer supported. Will be removed in a future release. */
async function requestPasswordReset(email: string): Promise<void> {
  await authHttp.post("/auth/password-reset/request", { email });
}

/** @deprecated Password reset is no longer supported. Will be removed in a future release. */
async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  await authHttp.post("/auth/password-reset/confirm", payload);
}

/** @deprecated Token validation via API is no longer used. Will be removed in a future release. */
async function validateToken(): Promise<User> {
  const response = await authHttp.get<User>("/auth/me");
  return response.data;
}

export const AuthService = {
  loginWithGoogle,
  login,
  register,
  logout,
  requestPasswordReset,
  resetPassword,
  validateToken,
};
