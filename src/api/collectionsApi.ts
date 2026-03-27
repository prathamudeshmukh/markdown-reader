import { authHeaders } from './authToken';
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '../types/collections';

const API_BASE = '/mreader/api/collections';

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await fetch(API_BASE, {
    headers: { ...authHeaders() },
  });
  const data = await parseResponse<{ collections: Collection[] }>(res);
  return data.collections;
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const body: Record<string, unknown> = { name: input.name };
  if (input.parentId !== undefined) body.parent_id = input.parentId;

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return parseResponse<Collection>(res);
}

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<void> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.parentId !== undefined) body.parent_id = input.parentId;
  if (input.position !== undefined) body.position = input.position;

  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  await parseResponse<unknown>(res);
}

export async function deleteCollection(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}
