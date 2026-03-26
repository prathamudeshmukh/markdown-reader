import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDoc, saveDoc, updateDoc, fetchUserDocs, setAuthToken } from './docsApi';

describe('docsApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    setAuthToken(undefined);
  });

  afterEach(() => {
    setAuthToken(undefined);
  });

  describe('fetchDoc', () => {
    it('returns doc on 200', async () => {
      const doc = { slug: 'abc1234', content: '# Hello', title: null };
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
    it('posts content object and returns slug', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'new1234' }), { status: 201 }),
      );

      const result = await saveDoc({ content: '# Hello' });

      expect(result).toEqual({ slug: 'new1234' });
      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: '# Hello' }),
        }),
      );
    });

    it('includes title in body when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'new1234' }), { status: 201 }),
      );

      await saveDoc({ content: '# Hello', title: 'My Doc' });

      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs',
        expect.objectContaining({
          body: JSON.stringify({ content: '# Hello', title: 'My Doc' }),
        }),
      );
    });

    it('includes Authorization header when auth token is set', async () => {
      setAuthToken('user-jwt-token');
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'new1234' }), { status: 201 }),
      );

      await saveDoc({ content: '# Hello' });

      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer user-jwt-token' }),
        }),
      );
    });

    it('throws on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Content too large' }), { status: 413 }),
      );
      await expect(saveDoc({ content: 'x' })).rejects.toThrow('Content too large');
    });
  });

  describe('updateDoc', () => {
    it('sends PUT with content object and resolves without returning a value', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'abc1234' }), { status: 200 }),
      );

      await expect(updateDoc('abc1234', { content: '# Updated' })).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs/abc1234',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: '# Updated' }),
        }),
      );
    });

    it('can update title only', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ slug: 'abc1234' }), { status: 200 }),
      );

      await updateDoc('abc1234', { title: 'New Title' });

      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs/abc1234',
        expect.objectContaining({
          body: JSON.stringify({ title: 'New Title' }),
        }),
      );
    });

    it('throws on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
      await expect(updateDoc('missing', { content: '# Hello' })).rejects.toThrow('Not found');
    });
  });

  describe('fetchUserDocs', () => {
    it('returns docs array from response', async () => {
      const docs = [{ slug: 'abc1234', title: 'My Doc', updatedAt: '2026-03-12T15:40:00.000Z' }];
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ docs }), { status: 200 }),
      );

      setAuthToken('user-jwt-token');
      const result = await fetchUserDocs();

      expect(result).toEqual(docs);
      expect(fetch).toHaveBeenCalledWith(
        '/mreader/api/docs',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer user-jwt-token' }),
        }),
      );
    });

    it('throws on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      );
      await expect(fetchUserDocs()).rejects.toThrow('Unauthorized');
    });
  });
});
