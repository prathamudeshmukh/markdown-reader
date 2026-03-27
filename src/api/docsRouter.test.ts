import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  createDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  getUserDocs: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc1234'),
}));

import { handleDocsRequest } from './docsRouter';
import { createDoc, getDoc, updateDoc, getUserDocs } from './supabaseClient';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
};

// Minimal JWT with sub=user-uuid
const userId = 'user-uuid-1234';
const jwtPayload = btoa(JSON.stringify({ sub: userId }));
const fakeJwt = `header.${jwtPayload}.sig`;

function makeRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>): Request {
  return new Request(`https://app.prathamesh.cloud${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('handleDocsRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for non-API paths', async () => {
    expect(await handleDocsRequest(makeRequest('GET', '/mreader/'), env)).toBeNull();
  });

  it('returns null for static asset paths', async () => {
    expect(await handleDocsRequest(makeRequest('GET', '/mreader/assets/index.js'), env)).toBeNull();
  });

  describe('POST /mreader/api/docs', () => {
    it('creates a doc and returns 201 with slug', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null });

      const res = await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', { content: '# Hello' }),
        env,
      );

      expect(res?.status).toBe(201);
      expect(await res?.json()).toEqual({ slug: 'abc1234' });
    });

    it('passes title to createDoc when provided', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: 'My Doc', user_id: null, collection_id: null });

      await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', { content: '# Hello', title: 'My Doc' }),
        env,
      );

      expect(createDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ title: 'My Doc' }),
      );
    });

    it('passes userJwt to createDoc when Authorization header present', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null });

      await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', { content: '# Hello' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(createDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ userJwt: fakeJwt }),
      );
    });

    it('returns 400 when content field is missing', async () => {
      const res = await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', {}),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 400 when content is not a string', async () => {
      const res = await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', { content: 42 }),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 413 when content exceeds size limit', async () => {
      const res = await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', { content: 'x'.repeat(500_001) }),
        env,
      );
      expect(res?.status).toBe(413);
    });
  });

  describe('GET /mreader/api/docs (user docs list)', () => {
    it('returns 401 when no Authorization header', async () => {
      const res = await handleDocsRequest(makeRequest('GET', '/mreader/api/docs'), env);
      expect(res?.status).toBe(401);
    });

    it('returns user docs when authorized', async () => {
      const docs = [{ slug: 'abc1234', title: 'My Doc', updatedAt: '2026-03-12T15:40:00.000Z', collectionId: null }];
      vi.mocked(getUserDocs).mockResolvedValueOnce(docs);

      const res = await handleDocsRequest(
        makeRequest('GET', '/mreader/api/docs', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ docs });
      expect(getUserDocs).toHaveBeenCalledWith(env, userId, fakeJwt);
    });
  });

  describe('GET /mreader/api/docs/:slug', () => {
    it('returns 200 with doc when found', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null });

      const res = await handleDocsRequest(makeRequest('GET', '/mreader/api/docs/abc1234'), env);

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ slug: 'abc1234', content: '# Hello', title: null, user_id: null });
    });

    it('forwards user JWT to getDoc when Authorization header is present', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null });

      await handleDocsRequest(
        makeRequest('GET', '/mreader/api/docs/abc1234', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(getDoc).toHaveBeenCalledWith(env, 'abc1234', fakeJwt);
    });

    it('passes undefined JWT to getDoc when no Authorization header', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null });

      await handleDocsRequest(makeRequest('GET', '/mreader/api/docs/abc1234'), env);

      expect(getDoc).toHaveBeenCalledWith(env, 'abc1234', undefined);
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(makeRequest('GET', '/mreader/api/docs/missing'), env);
      expect(res?.status).toBe(404);
    });
  });

  describe('PUT /mreader/api/docs/:slug', () => {
    it('returns 200 with slug on successful update', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/mreader/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ slug: 'abc1234' });
    });

    it('passes title to updateDoc when provided', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: 'New Title', user_id: null, collection_id: null });

      await handleDocsRequest(
        makeRequest('PUT', '/mreader/api/docs/abc1234', { content: '# Updated', title: 'New Title' }),
        env,
      );

      expect(updateDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ title: 'New Title' }),
      );
    });

    it('returns 200 for title-only update', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: 'New Title', user_id: null, collection_id: null });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/mreader/api/docs/abc1234', { title: 'New Title' }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(updateDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ content: undefined, title: 'New Title' }),
      );
    });

    it('returns 400 when neither content nor title is provided', async () => {
      const res = await handleDocsRequest(
        makeRequest('PUT', '/mreader/api/docs/abc1234', {}),
        env,
      );
      expect(res?.status).toBe(400);
    });
  });

  describe('unsupported methods', () => {
    it('returns 405 for DELETE on slug route', async () => {
      const res = await handleDocsRequest(
        makeRequest('DELETE', '/mreader/api/docs/abc1234'),
        env,
      );
      expect(res?.status).toBe(405);
    });

    it('returns 405 for PATCH on collection route', async () => {
      const res = await handleDocsRequest(
        makeRequest('PATCH', '/mreader/api/docs'),
        env,
      );
      expect(res?.status).toBe(405);
    });
  });
});
