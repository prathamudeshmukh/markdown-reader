import { nanoid } from 'nanoid';
import { createDoc, getDoc, updateDoc, getUserDocs, type SupabaseEnv } from './supabaseClient';
import { json, extractBearerToken, extractUserIdFromJwt } from './workerUtils';

export type RouterEnv = SupabaseEnv;

const API_PREFIX = '/mreader/api/docs';
const MAX_CONTENT_BYTES = 500_000;
const MAX_TITLE_CHARS = 300;
const SLUG_LENGTH = 7;
const CREATOR_TOKEN_LENGTH = 21;

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

  const creatorToken = nanoid(CREATOR_TOKEN_LENGTH);

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = nanoid(SLUG_LENGTH);
    try {
      const doc = await createDoc(env, slug, { content: body.content, title, userJwt, collectionId, creatorToken });
      return json({ slug: doc.slug, creatorToken }, 201);
    } catch (err) {
      const isDuplicate = err instanceof Error && err.message.includes('duplicate');
      if (attempt === 1 || !isDuplicate) throw err;
    }
  }

  return json({ error: 'Failed to generate unique slug' }, 500);
}

function docCacheKey(url: string): Request {
  return new Request(url, { method: 'GET' });
}

// Lazily accessed so tests can mock `caches` before the first call.
// caches.default is a Cloudflare Workers extension not in standard lib types.
function cfCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

async function handleGet(request: Request, slug: string, env: RouterEnv): Promise<Response> {
  const cacheKey = docCacheKey(request.url);
  let cached: Response | undefined;
  try {
    cached = await cfCache().match(cacheKey) ?? undefined;
  } catch {
    // Cache unavailable — fall through to DB
  }
  if (cached) return cached;

  const doc = await getDoc(env, slug);
  if (!doc) return json({ error: 'Not found' }, 404);

  const response = new Response(JSON.stringify(doc), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
    },
  });
  try {
    await cfCache().put(cacheKey, response.clone());
  } catch {
    // Cache write failure is non-fatal
  }
  return response;
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
  const body = (await request.json()) as {
    content?: unknown;
    title?: unknown;
    collection_id?: unknown;
    claim?: unknown;
    creatorToken?: unknown;
  };

  const isClaim = body.claim === true;

  if (isClaim) {
    const userJwt = extractBearerToken(request);
    if (!userJwt) return json({ error: 'Unauthorized' }, 401);

    const userId = extractUserIdFromJwt(userJwt);
    if (!userId) return json({ error: 'Invalid token' }, 401);

    if (typeof body.creatorToken !== 'string') {
      return json({ error: 'creatorToken is required for claim' }, 400);
    }

    const existing = await getDoc(env, slug);
    if (!existing) return json({ error: 'Not found' }, 404);

    if (!existing.creator_token || existing.creator_token !== body.creatorToken) {
      return json({ error: 'Invalid creator token' }, 403);
    }

    try {
      const { origin } = new URL(request.url);
      await cfCache().delete(docCacheKey(`${origin}${API_PREFIX}/${slug}`));
    } catch {
      // Cache invalidation failure is non-fatal
    }

    const doc = await updateDoc(env, slug, { userJwt, userId, clearCreatorToken: true });
    return json({ slug: doc.slug });
  }

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

  // Invalidate before the DB write so concurrent GETs bypass the cache
  // and read DB directly during the update window.
  try {
    const { origin } = new URL(request.url);
    await cfCache().delete(docCacheKey(`${origin}${API_PREFIX}/${slug}`));
  } catch {
    // Cache invalidation failure is non-fatal — DB is source of truth
  }

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
    if (method === 'GET') return handleGet(request, slug, env);
    if (method === 'PUT') return handlePut(request, slug, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
