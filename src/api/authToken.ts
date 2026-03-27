let token: string | undefined;

export function setAuthToken(t: string | undefined): void {
  token = t;
}

export function getAuthToken(): string | undefined {
  return token;
}

export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
