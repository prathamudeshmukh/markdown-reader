import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  createDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  getUserDocs: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('./apiKeyAuth', () => ({
  resolveApiKey: vi.fn().mockResolvedValue(null),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc1234'),
}));

import { handleDocsRequest } from './docsRouter';
import { createDoc, getDoc, updateDoc, getUserDocs, deleteDoc } from './supabaseClient';
import { resolveApiKey } from './apiKeyAuth';

const mockCache = {
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
};

Object.defineProperty(global, 'caches', {
  value: { default: mockCache },
  writable: true,
  configurable: true,
});

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
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

function deletedCacheUrls(): string[] {
  return mockCache.delete.mock.calls.map(([req]) => (req as Request).url);
}

function expectedCacheUrls(slug: string): string[] {
  return [
    `https://app.prathamesh.cloud/api/docs/${slug}`,
    `https://app.prathamesh.cloud/d/${slug}`,
    `https://app.prathamesh.cloud/api/og/${slug}.png`,
  ];
}

describe('handleDocsRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.match.mockResolvedValue(undefined);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.delete.mockResolvedValue(true);
  });

  it('returns null for non-API paths', async () => {
    expect(await handleDocsRequest(makeRequest('GET', '/'), env)).toBeNull();
  });

  it('returns null for static asset paths', async () => {
    expect(await handleDocsRequest(makeRequest('GET', '/assets/index.js'), env)).toBeNull();
  });

  describe('POST /api/docs', () => {
    it('creates a doc and returns 201 with slug and creatorToken', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: 'tok', edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: '# Hello' }),
        env,
      );

      expect(res?.status).toBe(201);
      const body = await res?.json() as { slug: string; creatorToken: string };
      expect(body.slug).toBe('abc1234');
      expect(typeof body.creatorToken).toBe('string');
      expect(body.creatorToken.length).toBeGreaterThan(0);
    });

    it('passes creatorToken to createDoc', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: 'tok', edit_access: false });

      await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: '# Hello' }),
        env,
      );

      expect(createDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ creatorToken: expect.any(String) }),
      );
    });

    it('passes title to createDoc when provided', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: 'My Doc', user_id: null, collection_id: null, creator_token: null, edit_access: false });

      await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: '# Hello', title: 'My Doc' }),
        env,
      );

      expect(createDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ title: 'My Doc' }),
      );
    });

    it('passes userJwt to createDoc when Authorization header present', async () => {
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });

      await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: '# Hello' }, { Authorization: `Bearer ${fakeJwt}` }),
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
        makeRequest('POST', '/api/docs', {}),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 400 when content is not a string', async () => {
      const res = await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: 42 }),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 413 when content exceeds size limit', async () => {
      const res = await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: 'x'.repeat(500_001) }),
        env,
      );
      expect(res?.status).toBe(413);
    });
  });

  describe('GET /api/docs (user docs list)', () => {
    it('returns 401 when no Authorization header', async () => {
      const res = await handleDocsRequest(makeRequest('GET', '/api/docs'), env);
      expect(res?.status).toBe(401);
    });

    it('returns user docs when authorized', async () => {
      const docs = [{ slug: 'abc1234', title: 'My Doc', updatedAt: '2026-03-12T15:40:00.000Z', collectionId: null }];
      vi.mocked(getUserDocs).mockResolvedValueOnce(docs);

      const res = await handleDocsRequest(
        makeRequest('GET', '/api/docs', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ docs });
      expect(getUserDocs).toHaveBeenCalledWith(env, userId, fakeJwt);
    });
  });

  describe('GET /api/docs/:slug', () => {
    it('returns 200 with doc when found', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(makeRequest('GET', '/api/docs/abc1234'), env);

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false });
    });

    it('calls getDoc with env and slug only (service role handles auth)', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });

      await handleDocsRequest(makeRequest('GET', '/api/docs/abc1234'), env);

      expect(getDoc).toHaveBeenCalledWith(env, 'abc1234');
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(makeRequest('GET', '/api/docs/missing'), env);
      expect(res?.status).toBe(404);
    });

    it('returns 200 and falls through to DB when cache.match throws', async () => {
      mockCache.match.mockRejectedValueOnce(new Error('cache unavailable'));
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(makeRequest('GET', '/api/docs/abc1234'), env);

      expect(res?.status).toBe(200);
      expect(getDoc).toHaveBeenCalledWith(env, 'abc1234');
    });

    it('returns 200 even when cache.put throws', async () => {
      mockCache.put.mockRejectedValueOnce(new Error('cache write failed'));
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(makeRequest('GET', '/api/docs/abc1234'), env);

      expect(res?.status).toBe(200);
    });
  });

  describe('PUT /api/docs/:slug', () => {
    it('returns 200 with slug on successful update', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ slug: 'abc1234' });
    });

    it('passes title to updateDoc when provided', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: 'New Title', user_id: null, collection_id: null, creator_token: null, edit_access: true });

      await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated', title: 'New Title' }),
        env,
      );

      expect(updateDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ title: 'New Title' }),
      );
    });

    it('returns 200 for title-only update', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: 'New Title', user_id: null, collection_id: null, creator_token: null, edit_access: true });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { title: 'New Title' }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(updateDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ content: undefined, title: 'New Title' }),
      );
    });

    it('still calls updateDoc and returns 200 when cache.delete throws', async () => {
      mockCache.delete.mockRejectedValueOnce(new Error('cache delete failed'));
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('invalidates all three per-slug cache keys on content update', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true });

      await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(mockCache.delete).toHaveBeenCalledTimes(3);
      expect(deletedCacheUrls()).toEqual(expect.arrayContaining(expectedCacheUrls('abc1234')));
    });

    it('returns 400 when neither content nor title is provided', async () => {
      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', {}),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 403 when edit_access is false, doc is owned, and requester is not the owner', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(403);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('returns 200 for unowned doc (user_id null) even without JWT', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: 'tok', edit_access: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null, creator_token: 'tok', edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(200);
    });

    it('returns 200 when edit_access is true and requester has no JWT', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: 'owner-id', collection_id: null, creator_token: null, edit_access: true });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(200);
    });

    it('returns 200 when edit_access is false but requester is the owner', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { content: '# Updated' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
    });

    it('returns 404 when doc does not exist during content update', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/missing', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(404);
    });
  });

  describe('PUT /api/docs/:slug — edit_access toggle', () => {
    it('returns 401 when no JWT provided', async () => {
      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { edit_access: true }),
        env,
      );
      expect(res?.status).toBe(401);
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { edit_access: true }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(404);
    });

    it('returns 403 when requester is not the owner', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'other-user', collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { edit_access: true }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(403);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('returns 200 and calls updateDoc with editAccess when owner toggles on', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: true });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { edit_access: true }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(updateDoc).toHaveBeenCalledWith(env, 'abc1234', expect.objectContaining({ editAccess: true }));
    });

    it('returns 200 and calls updateDoc with editAccess when owner toggles off', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: true });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { edit_access: false }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(updateDoc).toHaveBeenCalledWith(env, 'abc1234', expect.objectContaining({ editAccess: false }));
    });

    it('invalidates all three per-slug cache keys after toggle', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: true });

      await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { edit_access: true }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(mockCache.delete).toHaveBeenCalledTimes(3);
      expect(deletedCacheUrls()).toEqual(expect.arrayContaining(expectedCacheUrls('abc1234')));
    });
  });

  describe('PUT /api/docs/:slug — claim', () => {
    it('returns 401 when claim=true but no Authorization header', async () => {
      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { claim: true, creatorToken: 'valid-token' }),
        env,
      );
      expect(res?.status).toBe(401);
    });

    it('returns 403 when creatorToken does not match', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: 'correct-token', edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { claim: true, creatorToken: 'wrong-token' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(403);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('returns 403 when creator_token is already null (already claimed)', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { claim: true, creatorToken: 'any-token' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(403);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('returns 400 when claim=true but creatorToken is missing', async () => {
      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { claim: true }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 404 when doc does not exist during claim', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/missing', { claim: true, creatorToken: 'tok' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(404);
    });

    it('returns 200 and calls updateDoc with userId and clearCreatorToken on valid claim', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: 'correct-token', edit_access: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { claim: true, creatorToken: 'correct-token' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(updateDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ userId, clearCreatorToken: true }),
      );
    });

    it('invalidates all three per-slug cache keys on claim', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: 'correct-token', edit_access: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });

      await handleDocsRequest(
        makeRequest('PUT', '/api/docs/abc1234', { claim: true, creatorToken: 'correct-token' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(mockCache.delete).toHaveBeenCalledTimes(3);
      expect(deletedCacheUrls()).toEqual(expect.arrayContaining(expectedCacheUrls('abc1234')));
    });
  });

  describe('DELETE /api/docs/:slug', () => {
    it('returns 204 on successful delete by the doc owner', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);

      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/abc1234', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(204);
      expect(deleteDoc).toHaveBeenCalledWith(env, 'abc1234', fakeJwt);
    });

    it('returns 401 when no Authorization header', async () => {
      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/abc1234'),
        env,
      );
      expect(res?.status).toBe(401);
    });

    it('returns 401 when JWT is malformed', async () => {
      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/abc1234', undefined, { Authorization: 'Bearer not.a.valid.jwt' }),
        env,
      );
      expect(res?.status).toBe(401);
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/missing', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(404);
    });

    it('returns 403 when doc is owned by a different user', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'other-user', collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/abc1234', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(403);
      expect(deleteDoc).not.toHaveBeenCalled();
    });

    it('still returns 204 when cache invalidation throws (non-fatal)', async () => {
      mockCache.delete.mockRejectedValueOnce(new Error('cache unavailable'));
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);

      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/abc1234', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(204);
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('invalidates all three per-slug cache keys on delete', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false });
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);

      await handleDocsRequest(
        makeRequest('DELETE', '/api/docs/abc1234', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(mockCache.delete).toHaveBeenCalledTimes(3);
      expect(deletedCacheUrls()).toEqual(expect.arrayContaining(expectedCacheUrls('abc1234')));
    });

    it('returns 405 for DELETE on the base /api/docs path', async () => {
      const res = await handleDocsRequest(
        makeRequest('DELETE', '/api/docs'),
        env,
      );
      expect(res?.status).toBe(405);
    });
  });

  describe('unsupported methods', () => {
    it('returns 405 for PATCH on base path', async () => {
      const res = await handleDocsRequest(
        makeRequest('PATCH', '/api/docs'),
        env,
      );
      expect(res?.status).toBe(405);
    });
  });

  describe('API key auth (X-OpenMark-Key)', () => {
    it('creates a doc when API key resolves to a valid user', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId: 'api-key-user', keyId: 'key-id-1' });
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'api-key-user', collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: '# Hello' }, { 'X-OpenMark-Key': 'omk_test' }),
        env,
      );

      expect(res?.status).toBe(201);
      expect(createDoc).toHaveBeenCalledWith(
        env,
        'abc1234',
        expect.objectContaining({ userJwt: expect.any(String) }),
      );
    });

    it('returns 401 when API key header is present but resolveApiKey throws', async () => {
      vi.mocked(resolveApiKey).mockRejectedValueOnce(new Error('Invalid API key'));

      const res = await handleDocsRequest(
        makeRequest('POST', '/api/docs', { content: '# Hello' }, { 'X-OpenMark-Key': 'omk_bad' }),
        env,
      );

      expect(res?.status).toBe(401);
    });

    it('reads a doc with API key (no auth required for GET)', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId: 'api-key-user', keyId: 'key-id-1' });
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'api-key-user', collection_id: null, creator_token: null, edit_access: false });

      const res = await handleDocsRequest(
        makeRequest('GET', '/api/docs/abc1234', undefined, { 'X-OpenMark-Key': 'omk_test' }),
        env,
      );

      expect(res?.status).toBe(200);
    });
  });
});
