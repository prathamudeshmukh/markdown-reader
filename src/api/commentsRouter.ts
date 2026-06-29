import {
  getDoc,
  getComments,
  createComment,
  resolveComment,
  deleteComment,
  countComments,
  type SupabaseEnv,
  type CommentRow,
} from './supabaseClient';
import { json, extractBearerToken, extractUserIdFromJwt } from './workerUtils';
import type { Comment } from '../types/comments';

export type CommentsRouterEnv = SupabaseEnv & {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const API_PREFIX = '/api/docs';
const MAX_CONTENT_CHARS = 2000;
const MAX_ANCHOR_CHARS = 500;
const MAX_AUTHOR_CHARS = 100;
const COMMENT_LIMIT = 500;

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

function parseAuthorName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Anonymous';
  const trimmed = raw.trim().slice(0, MAX_AUTHOR_CHARS);
  return trimmed.length > 0 ? trimmed : 'Anonymous';
}

async function resolveAuthorName(request: Request, bodyAuthorName: unknown): Promise<{ authorName: string; userId: string | null }> {
  const jwt = extractBearerToken(request);

  if (jwt) {
    const userId = extractUserIdFromJwt(jwt) ?? null;
    if (typeof bodyAuthorName === 'string' && bodyAuthorName.trim().length > 0) {
      return { authorName: parseAuthorName(bodyAuthorName), userId };
    }
    try {
      const supabaseUrl = (request as Request & { _env?: CommentsRouterEnv })._env?.SUPABASE_URL;
      if (supabaseUrl) {
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json() as { user_metadata?: { full_name?: string }; email?: string };
          const fullName = userData.user_metadata?.full_name;
          if (fullName) return { authorName: fullName.slice(0, MAX_AUTHOR_CHARS), userId };
          const email = userData.email;
          if (email) return { authorName: email.split('@')[0].slice(0, MAX_AUTHOR_CHARS), userId };
        }
      }
    } catch {
      // fall through to anonymous
    }
    return { authorName: parseAuthorName(bodyAuthorName), userId };
  }

  return { authorName: parseAuthorName(bodyAuthorName), userId: null };
}

async function handleGet(slug: string, env: CommentsRouterEnv): Promise<Response> {
  const doc = await getDoc(env, slug);
  if (!doc) return json({ error: 'Not found' }, 404);

  const rows = await getComments(env, slug);
  return json({ comments: rows.map(rowToComment) });
}

async function handlePost(request: Request, slug: string, env: CommentsRouterEnv): Promise<Response> {
  const body = (await request.json()) as { content?: unknown; authorName?: unknown; anchorText?: unknown };

  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    return json({ error: 'content is required and must be a non-empty string' }, 400);
  }

  if (body.content.trim().length > MAX_CONTENT_CHARS) {
    return json({ error: `content must not exceed ${MAX_CONTENT_CHARS} characters` }, 400);
  }

  const doc = await getDoc(env, slug);
  if (!doc) return json({ error: 'Not found' }, 404);

  const count = await countComments(env, slug);
  if (count >= COMMENT_LIMIT) {
    return json({ error: 'Comment limit reached for this document' }, 429);
  }

  const { authorName, userId } = await resolveAuthorName(request, body.authorName);

  let anchorText: string | null = null;
  if (typeof body.anchorText === 'string' && body.anchorText.trim().length > 0) {
    anchorText = body.anchorText.trim().slice(0, MAX_ANCHOR_CHARS);
  }

  // Attach env for resolveAuthorName to use
  (request as Request & { _env?: CommentsRouterEnv })._env = env;

  const row = await createComment(env, {
    docSlug: slug,
    userId,
    authorName,
    content: body.content.trim(),
    anchorText,
  });

  return json({ comment: rowToComment(row) }, 201);
}

async function handlePatch(request: Request, id: string, env: CommentsRouterEnv): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'resolved') {
    return json({ error: 'Only the resolved field may be updated' }, 400);
  }

  if (typeof body.resolved !== 'boolean') {
    return json({ error: 'resolved must be a boolean' }, 400);
  }

  const row = await resolveComment(env, id, body.resolved);
  if (!row) return json({ error: 'Not found' }, 404);

  return json({ comment: rowToComment(row) });
}

async function handleDelete(request: Request, slug: string, id: string, env: CommentsRouterEnv): Promise<Response> {
  const jwt = extractBearerToken(request);
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const callerId = extractUserIdFromJwt(jwt);
  if (!callerId) return json({ error: 'Invalid token' }, 401);

  const doc = await getDoc(env, slug);
  if (!doc) return json({ error: 'Not found' }, 404);

  if (doc.user_id !== callerId) return json({ error: 'Forbidden' }, 403);

  await deleteComment(env, id, jwt);
  return new Response(null, { status: 204 });
}

export async function handleCommentsRequest(
  request: Request,
  env: CommentsRouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const { method } = request;

  // Match /api/docs/:slug/comments
  const listPattern = new RegExp(`^${API_PREFIX}/([^/]+)/comments$`);
  const itemPattern = new RegExp(`^${API_PREFIX}/([^/]+)/comments/([^/]+)$`);

  const listMatch = listPattern.exec(pathname);
  if (listMatch) {
    const slug = decodeURIComponent(listMatch[1]);
    if (method === 'GET') return handleGet(slug, env);
    if (method === 'POST') return handlePost(request, slug, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  const itemMatch = itemPattern.exec(pathname);
  if (itemMatch) {
    const slug = decodeURIComponent(itemMatch[1]);
    const id = decodeURIComponent(itemMatch[2]);
    if (method === 'PATCH') return handlePatch(request, id, env);
    if (method === 'DELETE') return handleDelete(request, slug, id, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
