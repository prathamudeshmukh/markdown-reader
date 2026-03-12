import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDoc, saveDoc, updateDoc } from './docsApi';

describe('docsApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('fetchDoc', () => {
    it('returns doc on 200', async () => {
      const doc = { slug: 'abc1234', content: '# Hello' };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(doc), { status: 200 }));

      const result = await fetchDoc('abc1234');

      expect(result).toEqual(doc);
      expect(fetch).toHaveBeenCalledWith('/mreader/api/docs/abc1234');
    });

    it('throws with error message on 404', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
      await expect(fetchDoc('missing')).rejects.toThrow('Not found');
    });

    it('throws on 500', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Server error' }), { status: 500 }),
      );
      await expect(fetchDoc('abc')).rejects.toThrow('Server error');
    });
  });

  describe('saveDoc', () => {
    it('posts content and returns slug', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'new1234' }), { status: 201 }),
      );

      const result = await saveDoc('# Hello');

      expect(result).toEqual({ slug: 'new1234' });
      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: '# Hello' }),
        }),
      );
    });

    it('throws on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Content too large' }), { status: 413 }),
      );
      await expect(saveDoc('x')).rejects.toThrow('Content too large');
    });
  });

  describe('updateDoc', () => {
    it('sends PUT and resolves without returning a value', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'abc1234' }), { status: 200 }),
      );

      await expect(updateDoc('abc1234', '# Updated')).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs/abc1234',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: '# Updated' }),
        }),
      );
    });

    it('throws on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
      await expect(updateDoc('missing', '# Hello')).rejects.toThrow('Not found');
    });
  });
});
