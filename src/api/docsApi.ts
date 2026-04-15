export { setAuthToken } from './authToken';
import { authHeaders } from './authToken';

const API_BASE = '/mreader/api/docs';

export interface Doc {
  slug: string;
  content: string;
  title: string | null;
  user_id: string | null;
}

export interface DocSummary {
  slug: string;
  title: string | null;
  updatedAt: string;
  collectionId: string | null;
}

export interface SaveDocInput {
  content: string;
  title?: string;
  collectionId?: string | null;
}

export interface UpdateDocInput {
  content?: string;
  title?: string;
  collectionId?: string | null;
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
  const body: Record<string, unknown> = { content: input.content };
  if (input.title !== undefined) body.title = input.title;
  if (input.collectionId !== undefined) body.collection_id = input.collectionId;

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return parseResponse<{ slug: string }>(res);
}

export async function updateDoc(slug: string, input: UpdateDocInput): Promise<void> {
  const body: Record<string, unknown> = {};
  if (input.content !== undefined) body.content = input.content;
  if (input.title !== undefined) body.title = input.title;
  if (input.collectionId !== undefined) body.collection_id = input.collectionId;

  const res = await fetch(`${API_BASE}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
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
