import type { Comment, CreateCommentInput } from '../types/comments';

const API_BASE = '/api/docs';

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/${slug}/comments`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseResponse<{ comments: Comment[] }>(res);
  return data.comments;
}

export async function postComment(slug: string, input: CreateCommentInput): Promise<Comment> {
  const res = await fetch(`${API_BASE}/${slug}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: input.content,
      authorName: input.authorName,
      anchorText: input.anchorText,
    }),
  });
  const data = await parseResponse<{ comment: Comment }>(res);
  return data.comment;
}

export async function resolveComment(slug: string, id: string, resolved: boolean): Promise<Comment> {
  const res = await fetch(`${API_BASE}/${slug}/comments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolved }),
  });
  const data = await parseResponse<{ comment: Comment }>(res);
  return data.comment;
}

export async function deleteComment(slug: string, id: string, jwt: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${slug}/comments/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}
