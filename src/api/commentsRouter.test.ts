import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  getDoc: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  resolveComment: vi.fn(),
  deleteComment: vi.fn(),
  countComments: vi.fn(),
}));

vi.mock('./apiKeyAuth', () => ({
  resolveApiKey: vi.fn().mockResolvedValue(null),
}));

import { handleCommentsRequest } from './commentsRouter';
import { getDoc, getComments, createComment, resolveComment, deleteComment, countComments } from './supabaseClient';
import { resolveApiKey } from './apiKeyAuth';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

const userId = 'user-uuid-1234';
const jwtPayload = btoa(JSON.stringify({ sub: userId }));
const fakeJwt = `header.${jwtPayload}.sig`;

function makeRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>): Request {
  return new Request(`https://app.test.com${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const mockDoc = { slug: 'doc123', content: '# Hello', title: null, user_id: userId, collection_id: null, creator_token: null, edit_access: false };

const mockComment = {
  id: 'comment-uuid-1',
  doc_slug: 'doc123',
  user_id: null,
  author_name: 'Anonymous',
  content: 'Test comment',
  anchor_text: 'Hello',
  resolved: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('handleCommentsRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for non-comments paths', async () => {
    const result = await handleCommentsRequest(makeRequest('GET', '/api/docs'), env);
    expect(result).toBeNull();
  });

  it('returns null for paths that do not match the comments route', async () => {
    const result = await handleCommentsRequest(makeRequest('GET', '/api/docs/doc123'), env);
    expect(result).toBeNull();
  });

  describe('GET /api/docs/:slug/comments', () => {
    it('returns 200 with comments array', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
      vi.mocked(getComments).mockResolvedValueOnce([mockComment]);

      const res = await handleCommentsRequest(makeRequest('GET', '/api/docs/doc123/comments'), env);

      expect(res?.status).toBe(200);
      const body = await res?.json() as { comments: unknown[] };
      expect(body.comments).toHaveLength(1);
      expect((body.comments[0] as { id: string }).id).toBe('comment-uuid-1');
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleCommentsRequest(makeRequest('GET', '/api/docs/missing/comments'), env);

      expect(res?.status).toBe(404);
    });
  });

  describe('POST /api/docs/:slug/comments', () => {
    it('returns 201 with created comment', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
      vi.mocked(countComments).mockResolvedValueOnce(0);
      vi.mocked(createComment).mockResolvedValueOnce(mockComment);

      const res = await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', { content: 'Test comment', anchorText: 'Hello' }),
        env,
      );

      expect(res?.status).toBe(201);
      const body = await res?.json() as { comment: { id: string } };
      expect(body.comment.id).toBe('comment-uuid-1');
    });

    it('returns 400 when content is missing', async () => {
      const res = await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', {}),
        env,
      );

      expect(res?.status).toBe(400);
    });

    it('returns 400 when content is empty string', async () => {
      const res = await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', { content: '   ' }),
        env,
      );

      expect(res?.status).toBe(400);
    });

    it('returns 400 when content exceeds 2000 chars', async () => {
      const res = await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', { content: 'x'.repeat(2001) }),
        env,
      );

      expect(res?.status).toBe(400);
    });

    it('stores Anonymous when authorName is blank', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
      vi.mocked(countComments).mockResolvedValueOnce(0);
      vi.mocked(createComment).mockResolvedValueOnce({ ...mockComment, author_name: 'Anonymous' });

      await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', { content: 'Hi', authorName: '' }),
        env,
      );

      expect(vi.mocked(createComment)).toHaveBeenCalledWith(
        env,
        expect.objectContaining({ authorName: 'Anonymous' }),
      );
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleCommentsRequest(
        makeRequest('POST', '/api/docs/missing/comments', { content: 'Hi' }),
        env,
      );

      expect(res?.status).toBe(404);
    });

    it('returns 429 when comment limit is hit', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
      vi.mocked(countComments).mockResolvedValueOnce(500);

      const res = await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', { content: 'Hi' }),
        env,
      );

      expect(res?.status).toBe(429);
    });

    it('truncates anchorText to 500 chars', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
      vi.mocked(countComments).mockResolvedValueOnce(0);
      vi.mocked(createComment).mockResolvedValueOnce(mockComment);

      await handleCommentsRequest(
        makeRequest('POST', '/api/docs/doc123/comments', { content: 'Hi', anchorText: 'x'.repeat(600) }),
        env,
      );

      expect(vi.mocked(createComment)).toHaveBeenCalledWith(
        env,
        expect.objectContaining({ anchorText: 'x'.repeat(500) }),
      );
    });
  });

  describe('PATCH /api/docs/:slug/comments/:id', () => {
    it('returns 200 with updated comment', async () => {
      vi.mocked(resolveComment).mockResolvedValueOnce({ ...mockComment, resolved: true });

      const res = await handleCommentsRequest(
        makeRequest('PATCH', '/api/docs/doc123/comments/comment-uuid-1', { resolved: true }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { comment: { resolved: boolean } };
      expect(body.comment.resolved).toBe(true);
    });

    it('returns 400 when resolved is not a boolean', async () => {
      const res = await handleCommentsRequest(
        makeRequest('PATCH', '/api/docs/doc123/comments/comment-uuid-1', { resolved: 'yes' }),
        env,
      );

      expect(res?.status).toBe(400);
    });

    it('returns 400 when non-resolved fields are present', async () => {
      const res = await handleCommentsRequest(
        makeRequest('PATCH', '/api/docs/doc123/comments/comment-uuid-1', { resolved: true, content: 'hack' }),
        env,
      );

      expect(res?.status).toBe(400);
    });
  });

  describe('DELETE /api/docs/:slug/comments/:id', () => {
    it('returns 204 for doc owner', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
      vi.mocked(deleteComment).mockResolvedValueOnce(undefined);

      const res = await handleCommentsRequest(
        makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1', undefined, {
          Authorization: `Bearer ${fakeJwt}`,
        }),
        env,
      );

      expect(res?.status).toBe(204);
    });

    it('returns 401 when no JWT is provided', async () => {
      const res = await handleCommentsRequest(
        makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1'),
        env,
      );

      expect(res?.status).toBe(401);
    });

    it('returns 403 when caller is not the doc owner', async () => {
      const otherJwtPayload = btoa(JSON.stringify({ sub: 'other-user-id' }));
      const otherJwt = `header.${otherJwtPayload}.sig`;

      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);

      const res = await handleCommentsRequest(
        makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1', undefined, {
          Authorization: `Bearer ${otherJwt}`,
        }),
        env,
      );

      expect(res?.status).toBe(403);
    });

    it('returns 404 when doc does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleCommentsRequest(
        makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1', undefined, {
          Authorization: `Bearer ${fakeJwt}`,
        }),
        env,
      );

      expect(res?.status).toBe(404);
    });

    describe('API key auth (X-OpenMark-Key)', () => {
      it('returns 204 when API key resolves to the doc owner', async () => {
        vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'key-id-1' });
        vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);
        vi.mocked(deleteComment).mockResolvedValueOnce(undefined);

        const res = await handleCommentsRequest(
          makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1', undefined, {
            'X-OpenMark-Key': 'omk_test',
          }),
          env,
        );

        expect(res?.status).toBe(204);
      });

      it('returns 403 when API key resolves to a non-owner', async () => {
        vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId: 'other-user-id', keyId: 'key-id-1' });
        vi.mocked(getDoc).mockResolvedValueOnce(mockDoc);

        const res = await handleCommentsRequest(
          makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1', undefined, {
            'X-OpenMark-Key': 'omk_test',
          }),
          env,
        );

        expect(res?.status).toBe(403);
      });

      it('returns 401 when API key is invalid', async () => {
        vi.mocked(resolveApiKey).mockRejectedValueOnce(new Error('Invalid API key'));

        const res = await handleCommentsRequest(
          makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1', undefined, {
            'X-OpenMark-Key': 'omk_bad',
          }),
          env,
        );

        expect(res?.status).toBe(401);
      });

      it('returns 401 when neither X-OpenMark-Key nor Authorization is present', async () => {
        const res = await handleCommentsRequest(
          makeRequest('DELETE', '/api/docs/doc123/comments/comment-uuid-1'),
          env,
        );

        expect(res?.status).toBe(401);
      });
    });
  });
});
