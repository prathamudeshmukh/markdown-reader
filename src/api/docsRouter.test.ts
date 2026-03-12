import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  createDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc1234'),
}));

import { handleDocsRequest } from './docsRouter';
import { createDoc, getDoc, updateDoc } from './supabaseClient';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
};

function makeRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`https://app.prathamesh.cloud${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello' });

      const res = await handleDocsRequest(
        makeRequest('POST', '/mreader/api/docs', { content: '# Hello' }),
        env,
      );

      expect(res?.status).toBe(201);
      expect(await res?.json()).toEqual({ slug: 'abc1234' });
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

  describe('GET /mreader/api/docs/:slug', () => {
    it('returns 200 with doc when found', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello' });

      const res = await handleDocsRequest(makeRequest('GET', '/mreader/api/docs/abc1234'), env);

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ slug: 'abc1234', content: '# Hello' });
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleDocsRequest(makeRequest('GET', '/mreader/api/docs/missing'), env);
      expect(res?.status).toBe(404);
    });
  });

  describe('PUT /mreader/api/docs/:slug', () => {
    it('returns 200 with slug on successful update', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Updated' });

      const res = await handleDocsRequest(
        makeRequest('PUT', '/mreader/api/docs/abc1234', { content: '# Updated' }),
        env,
      );

      expect(res?.status).toBe(200);
      expect(await res?.json()).toEqual({ slug: 'abc1234' });
    });

    it('returns 400 when content is missing', async () => {
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
