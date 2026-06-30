import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenMarkClient, extractSlug } from './openmarkClient.js';

const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

const config = {
  apiKey: 'omk_testkey12345678901234567890123456',
  baseUrl: 'https://openmark.cc',
};

describe('extractSlug', () => {
  it('passes through a bare slug unchanged', () => {
    expect(extractSlug('abc1234')).toBe('abc1234');
  });

  it('extracts slug from full openmark URL', () => {
    expect(extractSlug('https://openmark.cc/d/abc1234')).toBe('abc1234');
  });

  it('extracts slug from app.prathamesh.cloud URL', () => {
    expect(extractSlug('https://app.prathamesh.cloud/mreader/d/abc1234')).toBe('abc1234');
  });
});

describe('OpenMarkClient', () => {
  let client: OpenMarkClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenMarkClient(config);
  });

  describe('createDoc', () => {
    it('calls POST /api/docs with content and X-OpenMark-Key header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234', creatorToken: 'tok' }),
      });

      const result = await client.createDoc('# Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openmark.cc/api/docs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-OpenMark-Key': config.apiKey }),
        }),
      );
      expect(result.slug).toBe('abc1234');
      expect(result.url).toContain('abc1234');
    });

    it('includes title in body only when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234', creatorToken: 'tok' }),
      });

      await client.createDoc('# Hello', 'My Title');

      const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(body.title).toBe('My Title');
    });

    it('does not include title in body when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234', creatorToken: 'tok' }),
      });

      await client.createDoc('# Hello');

      const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(body.title).toBeUndefined();
    });

    it('throws on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
        text: async () => 'Unauthorized',
      });

      await expect(client.createDoc('# Hello')).rejects.toThrow('401');
    });
  });

  describe('readDoc', () => {
    it('calls GET /api/docs/:slug', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234', content: '# Hello', title: 'My Doc', user_id: null, collection_id: null, creator_token: null, edit_access: false }),
      });

      const result = await client.readDoc('abc1234');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openmark.cc/api/docs/abc1234',
        expect.any(Object),
      );
      expect(result.slug).toBe('abc1234');
      expect(result.title).toBe('My Doc');
      expect(result.content).toBe('# Hello');
    });

    it('extracts slug from full URL before fetching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234', content: '# Hi', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false }),
      });

      await client.readDoc('https://openmark.cc/d/abc1234');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openmark.cc/api/docs/abc1234',
        expect.any(Object),
      );
    });

    it('throws on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      });

      await expect(client.readDoc('missing')).rejects.toThrow('404');
    });
  });

  describe('updateDoc', () => {
    it('calls PUT /api/docs/:slug with content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234' }),
      });

      const result = await client.updateDoc('abc1234', '# Updated');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openmark.cc/api/docs/abc1234',
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(result.slug).toBe('abc1234');
    });

    it('includes title in body only when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'abc1234' }),
      });

      await client.updateDoc('abc1234', '# Updated', 'New Title');

      const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(body.title).toBe('New Title');
    });

    it('throws on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(client.updateDoc('abc1234', '# Bad')).rejects.toThrow('403');
    });
  });
});
