import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@app/api-client";
import { AuthContext } from "./AuthContext";
import { AuthService } from "./AuthService";
import { tokenStorage } from "./tokenStorage";
import type { User } from "./types";

export interface AuthProviderProps {
  children: React.ReactNode;
  /** Injected navigate function (from react-router-dom) to avoid direct import */
  navigate: (path: string) => void;
}

export function AuthProvider({ children, navigate }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // BR-FE-AUTH-06: Restore session from localStorage on mount; re-attach Authorization header
  useEffect(() => {
    const storedUser = tokenStorage.getUser();
    const storedToken = tokenStorage.getToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setIsLoading(false);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<void> => {
    const { token, user: loggedInUser } = await AuthService.loginWithGoogle(credential);
    tokenStorage.setToken(token);
    tokenStorage.setUser(loggedInUser);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(loggedInUser);
    navigate("/projects");
  }, [navigate]);

  const logout = useCallback(async (): Promise<void> => {
    tokenStorage.clearAll();
    delete apiClient.defaults.headers.common["Authorization"];
    setUser(null);
    navigate("/auth/login");
  }, [navigate]);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading, loginWithGoogle, logout }),
    [user, isLoading, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
