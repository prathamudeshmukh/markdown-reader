import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDoc, getDoc, updateDoc } from './supabaseClient';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
};

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('createDoc', () => {
    it('posts to the correct URL with auth headers', async () => {
      const doc = { slug: 'abc1234', content: '# Hello' };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 201 }),
      );

      const result = await createDoc(env, 'abc1234', '# Hello');

      expect(result).toEqual(doc);
      expect(fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/docs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ apikey: 'test-key' }),
        }),
      );
    });

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 400 }));
      await expect(createDoc(env, 'abc', '# Hello')).rejects.toThrow('createDoc failed');
    });
  });

  describe('getDoc', () => {
    it('returns doc when found', async () => {
      const doc = { slug: 'abc1234', content: '# Hello' };
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

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }));
      await expect(getDoc(env, 'abc')).rejects.toThrow('getDoc failed');
    });
  });

  describe('updateDoc', () => {
    it('patches to the correct URL', async () => {
      const doc = { slug: 'abc1234', content: '# Updated' };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([doc]), { status: 200 }),
      );

      const result = await updateDoc(env, 'abc1234', '# Updated');

      expect(result).toEqual(doc);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('slug=eq.abc1234'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('throws when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 400 }));
      await expect(updateDoc(env, 'abc', '# Hello')).rejects.toThrow('updateDoc failed');
    });
  });
});
