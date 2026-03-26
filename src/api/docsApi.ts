const API_BASE = '/mreader/api/docs';

export interface Doc {
  slug: string;
  content: string;
  title: string | null;
}

export interface DocSummary {
  slug: string;
  title: string | null;
  updatedAt: string;
}

export interface SaveDocInput {
  content: string;
  title?: string;
}

export interface UpdateDocInput {
  content?: string;
  title?: string;
}

let authToken: string | undefined;

export function setAuthToken(token: string | undefined): void {
  authToken = token;
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchDoc(slug: string): Promise<Doc> {
  const res = await fetch(`${API_BASE}/${slug}`, {
    headers: { ...authHeaders() },
  });
  return parseResponse<Doc>(res);
}

export async function saveDoc(input: SaveDocInput): Promise<{ slug: string }> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  return parseResponse<{ slug: string }>(res);
}

export async function updateDoc(slug: string, input: UpdateDocInput): Promise<void> {
  const res = await fetch(`${API_BASE}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  await parseResponse<unknown>(res);
}

export async function fetchUserDocs(): Promise<DocSummary[]> {
  const res = await fetch(API_BASE, {
    headers: { ...authHeaders() },
  });
  const data = await parseResponse<{ docs: DocSummary[] }>(res);
  return data.docs;
}
