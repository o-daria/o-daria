import type { User } from "./types";

const USER_KEY = "app.user";
const TOKEN_KEY = "app.token";

function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "email" in parsed &&
      "createdAt" in parsed
    ) {
      return parsed as User;
    }
    return null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAll(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export const tokenStorage = { getUser, setUser, clearUser, getToken, setToken, clearAll };
