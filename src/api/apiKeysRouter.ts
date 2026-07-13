import { nanoid } from 'nanoid';
import { insertApiKey, listApiKeys, deleteApiKey, type ApiKeyRecord } from './repository/apiKeys';
import type { SupabaseEnv } from './repository/shared';
import { json, requireAuth } from './workerUtils';

export type RouterEnv = SupabaseEnv;

const API_PREFIX = '/api/keys';
const KEY_PREFIX = 'omk_';
const KEY_BODY_LENGTH = 32;
const MAX_LABEL_LENGTH = 100;

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// The public GET /api/keys contract stays snake_case (matching what
// apiKeysApi.ts's fetchApiKeys already parses) regardless of the
// repository's internal camelCase shape.
function toWireApiKey(record: ApiKeyRecord): unknown {
  return { id: record.id, label: record.label, created_at: record.createdAt, last_used_at: record.lastUsedAt };
}

async function handleGet(request: Request, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const keys = await listApiKeys(env, auth.userId, auth.jwt);
  return json({ keys: keys.map(toWireApiKey) });
}

async function handlePost(request: Request, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { label?: unknown };
  const label = body.label;

  if (typeof label !== 'string' || label.trim().length === 0) {
    return json({ error: 'label is required' }, 400);
  }
  if (label.trim().length > MAX_LABEL_LENGTH) {
    return json({ error: `label must be at most ${MAX_LABEL_LENGTH} characters` }, 400);
  }

  const rawKey = KEY_PREFIX + nanoid(KEY_BODY_LENGTH);
  const keyHash = await sha256Hex(rawKey);

  const record = await insertApiKey(
    env,
    { userId: auth.userId, keyHash, label: label.trim() },
    auth.jwt,
  );

  return json({ id: record.id, label: record.label, key: rawKey, createdAt: record.createdAt }, 201);
}

async function handleDelete(request: Request, keyId: string, env: RouterEnv): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  if (!keyId) return json({ error: 'Key id is required' }, 400);

  await deleteApiKey(env, keyId, auth.userId, auth.jwt);
  return new Response(null, { status: 204 });
}

export async function handleApiKeysRequest(
  request: Request,
  env: RouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const { method } = request;

  if (pathname === API_PREFIX) {
    if (method === 'GET') return handleGet(request, env);
    if (method === 'POST') return handlePost(request, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  if (pathname.startsWith(`${API_PREFIX}/`)) {
    const keyId = pathname.slice(API_PREFIX.length + 1);
    if (method === 'DELETE') return handleDelete(request, keyId, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
