import type { AuthSession } from "../types/auth";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAuthSession(session: AuthSession): void {
  accessToken = session.accessToken;
}

export function clearAuthSession(): void {
  accessToken = null;
}
