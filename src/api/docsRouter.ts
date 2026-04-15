import { nanoid } from 'nanoid';
import { createDoc, getDoc, updateDoc, getUserDocs, type SupabaseEnv } from './supabaseClient';
import { json, extractBearerToken, extractUserIdFromJwt } from './workerUtils';

export type RouterEnv = SupabaseEnv;

const API_PREFIX = '/mreader/api/docs';
const MAX_CONTENT_BYTES = 500_000;
const MAX_TITLE_CHARS = 300;
const SLUG_LENGTH = 7;

function parseTitle(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().slice(0, MAX_TITLE_CHARS);
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseCollectionId(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw === 'string') return raw;
  return undefined;
}

async function handlePost(request: Request, env: RouterEnv): Promise<Response> {
  const body = (await request.json()) as { content?: unknown; title?: unknown; collection_id?: unknown };

  if (typeof body.content !== 'string') {
    return json({ error: 'content must be a string' }, 400);
  }

  if (new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Content too large' }, 413);
  }

  const title = parseTitle(body.title);
  const collectionId = parseCollectionId(body.collection_id);
  const userJwt = extractBearerToken(request);

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = nanoid(SLUG_LENGTH);
    try {
      const doc = await createDoc(env, slug, { content: body.content, title, userJwt, collectionId });
      return json({ slug: doc.slug }, 201);
    } catch (err) {
      const isDuplicate = err instanceof Error && err.message.includes('duplicate');
      if (attempt === 1 || !isDuplicate) throw err;
    }
  }

  return json({ error: 'Failed to generate unique slug' }, 500);
}

async function handleGet(slug: string, env: RouterEnv): Promise<Response> {
  const doc = await getDoc(env, slug);
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
  const body = (await request.json()) as { content?: unknown; title?: unknown; collection_id?: unknown };

  if (body.content !== undefined && typeof body.content !== 'string') {
    return json({ error: 'content must be a string' }, 400);
  }

  if (body.content === undefined && body.title === undefined && body.collection_id === undefined) {
    return json({ error: 'content, title, or collection_id is required' }, 400);
  }

  if (typeof body.content === 'string' && new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Content too large' }, 413);
  }

  const title = parseTitle(body.title);
  const collectionId = parseCollectionId(body.collection_id);
  const userJwt = extractBearerToken(request);

  const doc = await updateDoc(env, slug, {
    content: body.content as string | undefined,
    title,
    userJwt,
    collectionId,
  });
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
    if (method === 'GET') return handleGet(slug, env);
    if (method === 'PUT') return handlePut(request, slug, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
