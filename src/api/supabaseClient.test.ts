import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDoc, getDoc, updateDoc, getUserDocs } from './supabaseClient';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-header.test-payload.test-sig',
};

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('createDoc', () => {
    it('posts to the correct URL with auth headers', async () => {
      const doc = { slug: 'abc1234', content: '# Hello', title: null, user_id: null };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 201 }),
      );

      const result = await createDoc(env, 'abc1234', { content: '# Hello' });

      expect(result).toEqual(doc);
      expect(fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/docs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ apikey: 'test-anon-key' }),
        }),
      );
    });

    it('includes user_id when userJwt is provided', async () => {
      const doc = { slug: 'abc1234', content: '# Hello', title: null, user_id: 'user-uuid' };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 201 }),
      );

      // Minimal valid JWT with sub=user-uuid: header.payload.sig
      const payload = btoa(JSON.stringify({ sub: 'user-uuid' }));
      const fakeJwt = `header.${payload}.sig`;

      await createDoc(env, 'abc1234', { content: '# Hello', userJwt: fakeJwt });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${fakeJwt}` }),
        }),
      );
    });

    it('includes title when provided', async () => {
      const doc = { slug: 'abc1234', content: '# Hello', title: 'My Doc', user_id: null };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 201 }),
      );

      await createDoc(env, 'abc1234', { content: '# Hello', title: 'My Doc' });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.title).toBe('My Doc');
    });

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 400 }));
      await expect(createDoc(env, 'abc', { content: '# Hello' })).rejects.toThrow('createDoc failed');
    });
  });

  describe('getDoc', () => {
    it('returns doc when found', async () => {
      const doc = { slug: 'abc1234', content: '# Hello', title: null, user_id: null };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 200 }),
      );

      const result = await getDoc(env, 'abc1234');
      expect(result).toEqual(doc);
    });

    it('returns null when array is empty', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );

      const result = await getDoc(env, 'missing');
      expect(result).toBeNull();
    });

    it('encodes slug in the URL query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );

      await getDoc(env, 'abc1234');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('slug=eq.abc1234'),
        expect.any(Object),
      );
    });

    it('selects title in the URL query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );

      await getDoc(env, 'abc1234');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('title'),
        expect.any(Object),
      );
    });

    it('uses service role key in Authorization header to bypass RLS', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ slug: 'abc1234', content: '# Hello', title: null, user_id: 'uid' }]), { status: 200 }),
      );

      await getDoc(env, 'abc1234');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }),
        }),
      );
    });

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }));
      await expect(getDoc(env, 'abc')).rejects.toThrow('getDoc failed');
    });
  });

  describe('updateDoc', () => {
    it('patches to the correct URL', async () => {
      const doc = { slug: 'abc1234', content: '# Updated', title: null, user_id: null };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 200 }),
      );

      const result = await updateDoc(env, 'abc1234', { content: '# Updated' });

      expect(result).toEqual(doc);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('slug=eq.abc1234'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('sends only title when content is omitted', async () => {
      const doc = { slug: 'abc1234', content: '# Hello', title: 'New Title', user_id: null };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 200 }),
      );

      await updateDoc(env, 'abc1234', { title: 'New Title' });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.title).toBe('New Title');
      expect(body.content).toBeUndefined();
    });

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 400 }));
      await expect(updateDoc(env, 'abc', { content: '# Hello' })).rejects.toThrow('updateDoc failed');
    });
  });

  describe('getUserDocs', () => {
    it('returns mapped DocSummary array', async () => {
      const rows = [
        { slug: 'abc1234', title: 'My Doc', updated_at: '2026-03-12T15:40:00.000Z' },
      ];
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(rows), { status: 200 }),
      );

      const result = await getUserDocs(env, 'user-uuid', 'user-jwt');

      expect(result).toEqual([{ slug: 'abc1234', title: 'My Doc', updatedAt: '2026-03-12T15:40:00.000Z' }]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('user_id=eq.user-uuid'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }),
        }),
      );
    });

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 401 }));
      await expect(getUserDocs(env, 'uid', 'jwt')).rejects.toThrow('getUserDocs failed');
    });
  });
});
