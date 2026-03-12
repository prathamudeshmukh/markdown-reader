import { nanoid } from 'nanoid';
import { createDoc, getDoc, updateDoc, type SupabaseEnv } from './supabaseClient';

export type RouterEnv = SupabaseEnv;

const API_PREFIX = '/mreader/api/docs';
const MAX_CONTENT_BYTES = 500_000;
const SLUG_LENGTH = 7;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handlePost(request: Request, env: RouterEnv): Promise<Response> {
  const body = (await request.json()) as { content?: unknown };

  if (typeof body.content !== 'string') {
    return json({ error: 'content must be a string' }, 400);
  }

  if (new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Content too large' }, 413);
  }

  // Generate slug with one retry on collision
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = nanoid(SLUG_LENGTH);
    try {
      const doc = await createDoc(env, slug, body.content);
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

async function handlePut(request: Request, slug: string, env: RouterEnv): Promise<Response> {
  const body = (await request.json()) as { content?: unknown };

  if (typeof body.content !== 'string') {
    return json({ error: 'content must be a string' }, 400);
  }

  if (new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Content too large' }, 413);
  }

  const doc = await updateDoc(env, slug, body.content);
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
