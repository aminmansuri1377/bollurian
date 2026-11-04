/** In-memory only. Never put an administrator session in a backup or localStorage. */
let sessionToken: string | null = null;

export function getAdminSessionToken(): string | null { return sessionToken; }

export function acceptAdminSession(token: unknown): string {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new Error("ADMIN_UNAVAILABLE");
  }
  sessionToken = token;
  return token;
}

export function forgetAdminSession(token: string): void {
  if (sessionToken === token) sessionToken = null;
}
