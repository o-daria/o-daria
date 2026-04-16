export { AuthProvider } from "./AuthProvider";
export type { AuthProviderProps } from "./AuthProvider";

export { AuthContext } from "./AuthContext";
export type { AuthContextValue } from "./AuthContext";

export { useAuth } from "./useAuth";

export { AuthService } from "./AuthService";

export { tokenStorage } from "./tokenStorage";

export { withAuthGuard } from "./withAuthGuard";
export type { WithAuthGuardProps } from "./withAuthGuard";

export type {
  User,
  GoogleAuthResponse,
  AuthState,
  /** @deprecated Use GoogleAuthResponse instead. Will be removed in a future release. */
  LoginRequest,
  /** @deprecated Use GoogleAuthResponse instead. Will be removed in a future release. */
  LoginResponse,
  /** @deprecated Google Sign-In is the only supported registration path. Will be removed in a future release. */
  RegisterRequest,
  /** @deprecated Google Sign-In is the only supported registration path. Will be removed in a future release. */
  RegisterResponse,
  /** @deprecated Password reset is no longer supported. Will be removed in a future release. */
  ResetPasswordRequest,
} from "./types";
