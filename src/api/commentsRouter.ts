import { getDoc } from './repository/docs';
import { getComments, createComment, resolveComment, deleteComment, countComments } from './repository/comments';
import type { SupabaseEnv } from './repository/shared';
import { json, extractBearerToken, extractUserIdFromJwt, requireAuth, injectApiKeyAuth } from './workerUtils';

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

  const comments = await getComments(env, slug);
  return json({ comments });
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

  const comment = await createComment(env, {
    docSlug: slug,
    userId,
    authorName,
    content: body.content.trim(),
    anchorText,
  });

  return json({ comment }, 201);
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

  const comment = await resolveComment(env, id, body.resolved);
  if (!comment) return json({ error: 'Not found' }, 404);

  return json({ comment });
}

async function handleDelete(request: Request, slug: string, id: string, env: CommentsRouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const doc = await getDoc(env, slug);
  if (!doc) return json({ error: 'Not found' }, 404);

  if (doc.userId !== auth.userId) return json({ error: 'Forbidden' }, 403);

  await deleteComment(env, id, auth.jwt);
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
    if (method === 'DELETE') {
      // API-key auth (X-OpenMark-Key) is scoped to DELETE only — GET/PATCH stay open.
      const authResult = await injectApiKeyAuth(request, env);
      if (authResult instanceof Response) return authResult;
      return handleDelete(authResult, slug, id, env);
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
