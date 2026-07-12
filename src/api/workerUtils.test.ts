import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiKeyAuth', () => ({
  resolveApiKey: vi.fn(),
}));

import {
  json,
  cfCache,
  extractBearerToken,
  extractUserIdFromJwt,
  requireAuth,
  buildSyntheticJwt,
  injectApiKeyAuth,
} from './workerUtils';
import { resolveApiKey } from './apiKeyAuth';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://openmark.cc/api/docs', { headers });
}

function fakeJwt(userId: string): string {
  const payload = btoa(JSON.stringify({ sub: userId }));
  return `header.${payload}.sig`;
}

describe('json', () => {
  it('serializes the payload as JSON with the given status', async () => {
    const res = json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('defaults to status 200', () => {
    expect(json({}).status).toBe(200);
  });
});

describe('cfCache', () => {
  it('returns the default Cloudflare cache', () => {
    const mockCache = { match: vi.fn(), put: vi.fn(), delete: vi.fn() };
    Object.defineProperty(global, 'caches', {
      value: { default: mockCache },
      writable: true,
      configurable: true,
    });

    expect(cfCache()).toBe(mockCache);
  });
});

describe('extractBearerToken', () => {
  it('extracts the token from a Bearer Authorization header', () => {
    expect(extractBearerToken(makeRequest({ Authorization: 'Bearer abc.def.ghi' }))).toBe('abc.def.ghi');
  });

  it('returns undefined when the header is missing', () => {
    expect(extractBearerToken(makeRequest())).toBeUndefined();
  });

  it('returns undefined when the header is not a Bearer token', () => {
    expect(extractBearerToken(makeRequest({ Authorization: 'Basic abc' }))).toBeUndefined();
  });
});

describe('extractUserIdFromJwt', () => {
  it('extracts sub from a well-formed JWT payload', () => {
    expect(extractUserIdFromJwt(fakeJwt('user-1'))).toBe('user-1');
  });

  it('returns undefined for a malformed JWT', () => {
    expect(extractUserIdFromJwt('not-a-jwt')).toBeUndefined();
  });
});

describe('requireAuth', () => {
  it('returns jwt and userId when the request has a valid bearer JWT', () => {
    const result = requireAuth(makeRequest({ Authorization: `Bearer ${fakeJwt('user-1')}` }));
    expect(result).toEqual({ jwt: fakeJwt('user-1'), userId: 'user-1' });
  });

  it('returns a 401 Response when no Authorization header is present', () => {
    const result = requireAuth(makeRequest());
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('returns a 401 Response when the JWT has no sub claim', () => {
    const badJwt = `header.${btoa(JSON.stringify({}))}.sig`;
    const result = requireAuth(makeRequest({ Authorization: `Bearer ${badJwt}` }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });
});

describe('buildSyntheticJwt', () => {
  it('builds a JWT-shaped string whose payload sub matches the given userId', () => {
    const jwt = buildSyntheticJwt('user-1');
    expect(extractUserIdFromJwt(jwt)).toBe('user-1');
  });
});

describe('injectApiKeyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the request unchanged when X-OpenMark-Key is absent', async () => {
    const request = makeRequest();
    const result = await injectApiKeyAuth(request, env);
    expect(result).toBe(request);
    expect(resolveApiKey).not.toHaveBeenCalled();
  });

  it('returns the request unchanged when resolveApiKey finds no context', async () => {
    vi.mocked(resolveApiKey).mockResolvedValueOnce(null);
    const request = makeRequest({ 'X-OpenMark-Key': 'omk_test' });

    const result = await injectApiKeyAuth(request, env);

    expect(result).toBe(request);
  });

  it('injects a synthetic bearer token when the API key resolves to a user', async () => {
    vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId: 'user-1', keyId: 'key-1' });
    const request = makeRequest({ 'X-OpenMark-Key': 'omk_test' });

    const result = await injectApiKeyAuth(request, env);

    expect(result).toBeInstanceOf(Request);
    const injected = result as Request;
    const jwt = extractBearerToken(injected);
    expect(jwt && extractUserIdFromJwt(jwt)).toBe('user-1');
  });

  it('returns a 401 Response when resolveApiKey throws', async () => {
    vi.mocked(resolveApiKey).mockRejectedValueOnce(new Error('Invalid API key'));
    const request = makeRequest({ 'X-OpenMark-Key': 'omk_bad' });

    const result = await injectApiKeyAuth(request, env);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });
});
