import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, requestJson, RepositoryError, eq, restPath, callerAuth } from './shared';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

function fakeJwt(sub = 'user-1'): string {
  return `header.${btoa(JSON.stringify({ sub }))}.sig`;
}

const syntheticJwt = `synthetic.${btoa(JSON.stringify({ sub: 'user-1' }))}.internal`;

describe('eq', () => {
  it('builds a PostgREST eq filter with URL-encoded value', () => {
    expect(eq('slug', 'a b')).toBe('slug=eq.a%20b');
  });
});

describe('restPath', () => {
  it('joins params with & when present', () => {
    expect(restPath('docs', 'slug=eq.abc', 'select=slug,title')).toBe('docs?slug=eq.abc&select=slug,title');
  });

  it('returns just the table name when no params are given', () => {
    expect(restPath('docs')).toBe('docs');
  });
});

describe('callerAuth', () => {
  it('returns a caller auth mode when a jwt is given', () => {
    expect(callerAuth('some.jwt.token')).toEqual({ type: 'caller', jwt: 'some.jwt.token' });
  });

  it('returns anon auth mode when no jwt is given', () => {
    expect(callerAuth(undefined)).toEqual({ type: 'anon' });
  });
});

describe('request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('uses the anon key for anon auth mode', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await request(env, 'docs', { auth: { type: 'anon' } });

    expect(fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/rest/v1/docs',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-anon-key' }) }),
    );
  });

  it('uses the service-role key for service-role auth mode', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await request(env, 'docs', { auth: { type: 'service-role' } });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-service-key' }) }),
    );
  });

  it('uses the caller JWT verbatim when it is a real JWT', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));
    const jwt = fakeJwt();

    await request(env, 'docs', { auth: { type: 'caller', jwt } });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${jwt}` }) }),
    );
  });

  it('substitutes the service-role key when the caller JWT is synthetic', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await request(env, 'docs', { auth: { type: 'caller', jwt: syntheticJwt } });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-service-key' }) }),
    );
  });

  it('sets Content-Type and Prefer headers when a body and representation are requested', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await request(env, 'docs', { method: 'POST', body: { slug: 'abc' }, auth: { type: 'anon' }, representation: true });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ slug: 'abc' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      }),
    );
  });

  it('sets Prefer: count=exact when countExact is requested', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await request(env, 'comments', { auth: { type: 'service-role' }, countExact: true });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Prefer: 'count=exact' }) }),
    );
  });

  it('classifies a 404 as not_found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404 }));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({ kind: 'not_found', status: 404 });
  });

  it('classifies a 409 as conflict', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('conflict', { status: 409 }));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({ kind: 'conflict', status: 409 });
  });

  it('classifies a Postgres 23505 unique_violation as conflict regardless of HTTP status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint' }), { status: 400 }),
    );

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('classifies a 401 as rls_denied', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({ kind: 'rls_denied', status: 401 });
  });

  it('classifies a 403 as rls_denied', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('forbidden', { status: 403 }));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({ kind: 'rls_denied', status: 403 });
  });

  it('classifies an unmatched failure as network', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('server error', { status: 500 }));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({ kind: 'network', status: 500 });
  });

  it('classifies a fetch-level throw as a network RepositoryError', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toMatchObject({
      kind: 'network',
      status: 0,
    });
  });

  it('throws an instance of RepositoryError on fetch-level failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(request(env, 'docs', { auth: { type: 'anon' } })).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe('requestJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('parses and returns the JSON response body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ slug: 'abc' }]), { status: 200 }));

    const result = await requestJson<Array<{ slug: string }>>(env, 'docs', { auth: { type: 'anon' } });

    expect(result).toEqual([{ slug: 'abc' }]);
  });
});
