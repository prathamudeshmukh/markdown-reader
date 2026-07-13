import { getCollections, createCollection, updateCollection, deleteCollection } from './repository/collections';
import type { SupabaseEnv } from './repository/shared';
import { json, requireAuth } from './workerUtils';

export type RouterEnv = SupabaseEnv;

const API_PREFIX = '/api/collections';
const MAX_NAME_CHARS = 200;

function parseName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().slice(0, MAX_NAME_CHARS);
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseParentId(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw === 'string') return raw;
  return undefined;
}

async function handleGetAll(request: Request, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const collections = await getCollections(env, auth.userId, auth.jwt);
  return json({ collections });
}

async function handlePost(request: Request, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { name?: unknown; parent_id?: unknown };
  const name = parseName(body.name);
  if (!name) return json({ error: 'name must be a non-empty string (max 200 chars)' }, 400);

  const parentId = parseParentId(body.parent_id);
  const collection = await createCollection(env, { name, parentId, userId: auth.userId, userJwt: auth.jwt });
  return json(collection, 201);
}

async function handlePatch(request: Request, id: string, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { name?: unknown; parent_id?: unknown; position?: unknown };
  const name = parseName(body.name);
  const parentId = parseParentId(body.parent_id);
  const position = typeof body.position === 'number' ? body.position : undefined;

  if (name === undefined && parentId === undefined && position === undefined) {
    return json({ error: 'name, parent_id, or position is required' }, 400);
  }

  const collection = await updateCollection(env, id, { name, parentId, position, userJwt: auth.jwt });
  return json(collection);
}

async function handleDelete(request: Request, id: string, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  await deleteCollection(env, id, auth.jwt);
  return new Response(null, { status: 204 });
}

export async function handleCollectionsRequest(
  request: Request,
  env: RouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const { method } = request;

  if (pathname === API_PREFIX) {
    if (method === 'GET') return handleGetAll(request, env);
    if (method === 'POST') return handlePost(request, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  if (pathname.startsWith(`${API_PREFIX}/`)) {
    const id = pathname.slice(API_PREFIX.length + 1);
    if (!id) return json({ error: 'Not found' }, 404);
    if (method === 'PATCH') return handlePatch(request, id, env);
    if (method === 'DELETE') return handleDelete(request, id, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
