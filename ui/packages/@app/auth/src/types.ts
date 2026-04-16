export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface GoogleAuthResponse {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/** @deprecated Use GoogleAuthResponse instead. Will be removed in a future release. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** @deprecated Use GoogleAuthResponse instead. Will be removed in a future release. */
export interface LoginResponse {
  user: User;
}

/** @deprecated Google Sign-In is the only supported registration path. Will be removed in a future release. */
export interface RegisterRequest {
  email: string;
  password: string;
}

/** @deprecated Google Sign-In is the only supported registration path. Will be removed in a future release. */
export interface RegisterResponse {
  user: User;
}

/** @deprecated Password reset is no longer supported. Will be removed in a future release. */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
