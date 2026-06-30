import { authHeaders } from './authToken';

const API_BASE = '/api/keys';

export interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch(API_BASE, { headers: { ...authHeaders() } });
  const data = await parseResponse<{ keys: Array<{ id: string; label: string; created_at: string; last_used_at: string | null }> }>(res);
  return data.keys.map((k) => ({
    id: k.id,
    label: k.label,
    createdAt: k.created_at,
    lastUsedAt: k.last_used_at,
  }));
}

export async function createApiKey(label: string): Promise<{ key: ApiKey; rawKey: string }> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ label }),
  });
  const data = await parseResponse<{ id: string; label: string; key: string; createdAt: string }>(res);
  return {
    key: { id: data.id, label: data.label, createdAt: data.createdAt, lastUsedAt: null },
    rawKey: data.key,
  };
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}
