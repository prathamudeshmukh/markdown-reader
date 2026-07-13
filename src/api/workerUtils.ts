import { resolveApiKey } from './apiKeyAuth';
import type { SupabaseEnv } from './repository/shared';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Lazily accessed so tests can mock `caches` before the first call.
// caches.default is a Cloudflare Workers extension not in standard lib types.
export function cfCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

export function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}

export function extractUserIdFromJwt(jwt: string): string | undefined {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1])) as { sub?: string };
    return payload.sub;
  } catch {
    return undefined;
  }
}

export function requireAuth(request: Request): { jwt: string; userId: string } | Response {
  const jwt = extractBearerToken(request);
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const userId = extractUserIdFromJwt(jwt);
  if (!userId) return json({ error: 'Invalid token' }, 401);

  return { jwt, userId };
}

// Bridge: the repository's write functions take a userJwt rather than a
// plain userId, so callers that only have a userId (API-key auth, MCP tools)
// fake a JWT just to thread it through. Remove if the repository ever accepts
// userId directly — see the "RLS defense-in-depth" discussion for why that's
// a deliberate security-posture decision, not a mechanical one.
export function buildSyntheticJwt(userId: string): string {
  const payload = btoa(JSON.stringify({ sub: userId }));
  return `synthetic.${payload}.internal`;
}

function injectBearerToken(request: Request, jwt: string): Request {
  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${jwt}`);
  return new Request(request, { headers });
}

// Opt-in per call site: resolves X-OpenMark-Key into a synthetic bearer token
// on the returned Request, leaving the request unchanged when the header is
// absent. Returns a 401 Response when the header is present but invalid.
// Call once at router-dispatch entry, only from routers that accept API keys.
export async function injectApiKeyAuth(request: Request, env: SupabaseEnv): Promise<Request | Response> {
  if (!request.headers.has('X-OpenMark-Key')) return request;

  try {
    const ctx = await resolveApiKey(request, env);
    if (!ctx) return request;
    return injectBearerToken(request, buildSyntheticJwt(ctx.userId));
  } catch {
    return json({ error: 'Invalid API key' }, 401);
  }
}
