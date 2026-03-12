const API_BASE = '/mreader/api/docs';

export interface Doc {
  slug: string;
  content: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchDoc(slug: string): Promise<Doc> {
  const res = await fetch(`${API_BASE}/${slug}`);
  return parseResponse<Doc>(res);
}

export async function saveDoc(content: string): Promise<{ slug: string }> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return parseResponse<{ slug: string }>(res);
}

export async function updateDoc(slug: string, content: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  await parseResponse<unknown>(res);
}
