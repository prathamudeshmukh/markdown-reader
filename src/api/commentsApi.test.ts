import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchComments, postComment, resolveComment, deleteComment } from './commentsApi';

describe('commentsApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  const mockComment = {
    id: 'c1',
    docSlug: 'doc123',
    userId: null,
    authorName: 'Anonymous',
    content: 'Hello',
    anchorText: 'selected text',
    resolved: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  describe('fetchComments', () => {
    it('returns comments array on 200', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ comments: [mockComment] }), { status: 200 }),
      );

      const result = await fetchComments('doc123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
      expect(fetch).toHaveBeenCalledWith('/api/docs/doc123/comments', expect.any(Object));
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );

      await expect(fetchComments('missing')).rejects.toThrow('Not found');
    });
  });

  describe('postComment', () => {
    it('posts comment and returns created comment on 201', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ comment: mockComment }), { status: 201 }),
      );

      const result = await postComment('doc123', { content: 'Hello', authorName: '', anchorText: 'selected text' });

      expect(result.id).toBe('c1');
      expect(fetch).toHaveBeenCalledWith(
        '/api/docs/doc123/comments',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on 400', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'content is required' }), { status: 400 }),
      );

      await expect(
        postComment('doc123', { content: '', authorName: '', anchorText: null }),
      ).rejects.toThrow('content is required');
    });
  });

  describe('resolveComment', () => {
    it('sends PATCH and returns updated comment', async () => {
      const updated = { ...mockComment, resolved: true };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ comment: updated }), { status: 200 }),
      );

      const result = await resolveComment('doc123', 'c1', true);

      expect(result.resolved).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        '/api/docs/doc123/comments/c1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ resolved: true }),
        }),
      );
    });

    it('throws on error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );

      await expect(resolveComment('doc123', 'missing', true)).rejects.toThrow('Not found');
    });
  });

  describe('deleteComment', () => {
    it('sends DELETE with Authorization header and resolves on 204', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteComment('doc123', 'c1', 'my-jwt');

      expect(fetch).toHaveBeenCalledWith(
        '/api/docs/doc123/comments/c1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
        }),
      );
    });

    it('throws on 403', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
      );

      await expect(deleteComment('doc123', 'c1', 'bad-jwt')).rejects.toThrow('Forbidden');
    });
  });
});
