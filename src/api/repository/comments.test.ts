import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getComments, createComment, resolveComment, deleteComment, countComments } from './comments';
import { RepositoryError } from './shared';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

const row = {
  id: 'comment-1',
  doc_slug: 'abc1234',
  user_id: 'user-1',
  author_name: 'Alice',
  content: 'Nice doc!',
  anchor_text: 'some text',
  resolved: false,
  created_at: '2026-03-12T15:40:00.000Z',
  updated_at: '2026-03-12T15:40:00.000Z',
};

const camelComment = {
  id: 'comment-1',
  docSlug: 'abc1234',
  userId: 'user-1',
  authorName: 'Alice',
  content: 'Nice doc!',
  anchorText: 'some text',
  resolved: false,
  createdAt: '2026-03-12T15:40:00.000Z',
  updatedAt: '2026-03-12T15:40:00.000Z',
};

describe('comments repository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('getComments', () => {
    it('returns comments mapped to the camelCase Comment shape', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      const result = await getComments(env, 'abc1234');

      expect(result).toEqual([camelComment]);
    });

    it('uses the service-role key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getComments(env, 'abc1234');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) }),
      );
    });
  });

  describe('createComment', () => {
    it('posts and maps the returned row to a Comment', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 201 }));

      const result = await createComment(env, {
        docSlug: 'abc1234',
        userId: 'user-1',
        authorName: 'Alice',
        content: 'Nice doc!',
        anchorText: 'some text',
      });

      expect(result).toEqual(camelComment);
    });

    it('omits user_id from the body when userId is null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ ...row, user_id: null }]), { status: 201 }));

      await createComment(env, { docSlug: 'abc1234', userId: null, authorName: 'Anon', content: 'hi', anchorText: null });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.user_id).toBeUndefined();
    });
  });

  describe('resolveComment', () => {
    it('patches the resolved field and maps the result', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ ...row, resolved: true }]), { status: 200 }));

      const result = await resolveComment(env, 'comment-1', true);

      expect(result).toEqual({ ...camelComment, resolved: true });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('id=eq.comment-1'), expect.objectContaining({ method: 'PATCH' }));
    });
  });

  describe('deleteComment', () => {
    it('sends the real user JWT as the Bearer token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteComment(env, 'comment-1', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }) }),
      );
    });

    // Regression test: deleteComment previously bypassed the synthetic-JWT/service-role
    // substitution, the same bug fixed in deleteDoc.
    it('substitutes the service-role key when the JWT is synthetic (API-key auth)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
      const syntheticJwt = `synthetic.${btoa(JSON.stringify({ sub: 'user-1' }))}.internal`;

      await deleteComment(env, 'comment-1', syntheticJwt);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) }),
      );
    });

    it('throws a RepositoryError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

      await expect(deleteComment(env, 'comment-1', 'user-jwt')).rejects.toBeInstanceOf(RepositoryError);
    });
  });

  describe('countComments', () => {
    it('parses the count from the Content-Range header', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('[]', { status: 200, headers: { 'Content-Range': '0-0/42' } }),
      );

      const result = await countComments(env, 'abc1234');

      expect(result).toBe(42);
    });

    it('falls back to the response body length when Content-Range is absent', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ id: '1' }, { id: '2' }]), { status: 200 }));

      const result = await countComments(env, 'abc1234');

      expect(result).toBe(2);
    });

    it('requests an exact count via the Prefer header', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('[]', { status: 200 }));

      await countComments(env, 'abc1234');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Prefer: 'count=exact' }) }),
      );
    });
  });
});
