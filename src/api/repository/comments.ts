import type { Comment } from '../../types/comments';
import { request, requestJson, restPath, eq, callerAuth, type SupabaseEnv } from './shared';

interface CommentRow {
  id: string;
  doc_slug: string;
  user_id: string | null;
  author_name: string;
  content: string;
  anchor_text: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    docSlug: row.doc_slug,
    userId: row.user_id,
    authorName: row.author_name,
    content: row.content,
    anchorText: row.anchor_text,
    resolved: row.resolved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getComments(env: SupabaseEnv, docSlug: string): Promise<Comment[]> {
  const path = restPath('comments', eq('doc_slug', docSlug), 'order=created_at.asc');
  const rows = await requestJson<CommentRow[]>(env, path, { auth: { type: 'service-role' } });
  return rows.map(rowToComment);
}

interface CreateCommentFields {
  docSlug: string;
  userId: string | null;
  authorName: string;
  content: string;
  anchorText: string | null;
}

export async function createComment(env: SupabaseEnv, fields: CreateCommentFields): Promise<Comment> {
  const body: Record<string, unknown> = {
    doc_slug: fields.docSlug,
    author_name: fields.authorName,
    content: fields.content,
  };
  if (fields.userId !== null) body.user_id = fields.userId;
  if (fields.anchorText !== null) body.anchor_text = fields.anchorText;

  const rows = await requestJson<CommentRow[]>(env, 'comments', {
    method: 'POST',
    body,
    auth: callerAuth(undefined),
    representation: true,
  });

  return rowToComment(rows[0]);
}

export async function resolveComment(env: SupabaseEnv, id: string, resolved: boolean): Promise<Comment> {
  const rows = await requestJson<CommentRow[]>(env, restPath('comments', eq('id', id)), {
    method: 'PATCH',
    body: { resolved, updated_at: new Date().toISOString() },
    auth: callerAuth(undefined),
    representation: true,
  });

  return rowToComment(rows[0]);
}

export async function deleteComment(env: SupabaseEnv, id: string, userJwt: string): Promise<void> {
  await request(env, restPath('comments', eq('id', id)), { method: 'DELETE', auth: callerAuth(userJwt) });
}

export async function countComments(env: SupabaseEnv, docSlug: string): Promise<number> {
  const res = await request(env, restPath('comments', eq('doc_slug', docSlug), 'select=id'), {
    auth: { type: 'service-role' },
    countExact: true,
  });

  const contentRange = res.headers.get('Content-Range');
  if (contentRange) {
    const match = /\/(\d+)$/.exec(contentRange);
    if (match) return parseInt(match[1], 10);
  }

  const rows: unknown[] = await res.json();
  return rows.length;
}
