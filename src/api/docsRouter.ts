import { nanoid } from 'nanoid';
import { createDoc, getDoc, updateDoc, getUserDocs, type SupabaseEnv } from './supabaseClient';

export type RouterEnv = SupabaseEnv;

const API_PREFIX = '/mreader/api/docs';
const MAX_CONTENT_BYTES = 500_000;
const MAX_TITLE_CHARS = 300;
const SLUG_LENGTH = 7;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}

function extractUserIdFromJwt(jwt: string): string | undefined {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1])) as { sub?: string };
    return payload.sub;
  } catch {
    return undefined;
  }
}

function parseTitle(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().slice(0, MAX_TITLE_CHARS);
  return trimmed.length > 0 ? trimmed : undefined;
}

async function handlePost(request: Request, env: RouterEnv): Promise<Response> {
  const body = (await request.json()) as { content?: unknown; title?: unknown };

  if (typeof body.content !== 'string') {
    return json({ error: 'content must be a string' }, 400);
  }

  if (new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Content too large' }, 413);
  }

  const title = parseTitle(body.title);
  const userJwt = extractBearerToken(request);

  // Generate slug with one retry on collision
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = nanoid(SLUG_LENGTH);
    try {
      const doc = await createDoc(env, slug, { content: body.content, title, userJwt });
      return json({ slug: doc.slug }, 201);
    } catch (err) {
      const isDuplicate = err instanceof Error && err.message.includes('duplicate');
      if (attempt === 1 || !isDuplicate) throw err;
    }
  }

  return json({ error: 'Failed to generate unique slug' }, 500);
}

async function handleGet(slug: string, env: RouterEnv, request: Request): Promise<Response> {
  const userJwt = extractBearerToken(request);
  const doc = await getDoc(env, slug, userJwt);
  if (!doc) return json({ error: 'Not found' }, 404);
  return json(doc);
}

async function handleGetUserDocs(request: Request, env: RouterEnv): Promise<Response> {
  const userJwt = extractBearerToken(request);
  if (!userJwt) return json({ error: 'Unauthorized' }, 401);

  const userId = extractUserIdFromJwt(userJwt);
  if (!userId) return json({ error: 'Invalid token' }, 401);

  const docs = await getUserDocs(env, userId, userJwt);
  return json({ docs });
}

async function handlePut(request: Request, slug: string, env: RouterEnv): Promise<Response> {
  const body = (await request.json()) as { content?: unknown; title?: unknown };

  if (body.content !== undefined && typeof body.content !== 'string') {
    return json({ error: 'content must be a string' }, 400);
  }

  if (body.content === undefined && body.title === undefined) {
    return json({ error: 'content or title is required' }, 400);
  }

  if (typeof body.content === 'string' && new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Content too large' }, 413);
  }

  const title = parseTitle(body.title);
  const userJwt = extractBearerToken(request);

  const doc = await updateDoc(env, slug, { content: body.content as string | undefined, title, userJwt });
  return json({ slug: doc.slug });
}

export async function handleDocsRequest(
  request: Request,
  env: RouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const { method } = request;

  if (pathname === API_PREFIX) {
    if (method === 'POST') return handlePost(request, env);
    if (method === 'GET') return handleGetUserDocs(request, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  if (pathname.startsWith(`${API_PREFIX}/`)) {
    const slug = pathname.slice(API_PREFIX.length + 1);
    if (!slug) return json({ error: 'Not found' }, 404);
    if (method === 'GET') return handleGet(slug, env, request);
    if (method === 'PUT') return handlePut(request, slug, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
