import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./openmarkClient.js', () => ({
  OpenMarkClient: vi.fn(),
}));

import { OpenMarkClient } from './openmarkClient.js';
import { buildToolHandlers } from './tools.js';

const mockClient = {
  createDoc: vi.fn(),
  readDoc: vi.fn(),
  updateDoc: vi.fn(),
};

describe('buildToolHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(OpenMarkClient).mockImplementation(() => mockClient as unknown as OpenMarkClient);
  });

  describe('openmark_create_doc', () => {
    it('returns "Created: <url>" on success', async () => {
      mockClient.createDoc.mockResolvedValueOnce({ slug: 'abc1234', url: 'https://openmark.cc/d/abc1234' });

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_create_doc({ content: '# Hello' });

      expect(result).toContain('Created:');
      expect(result).toContain('abc1234');
    });

    it('throws Zod error when content is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_create_doc({})).rejects.toThrow();
    });

    it('passes title to createDoc only when provided', async () => {
      mockClient.createDoc.mockResolvedValueOnce({ slug: 'abc1234', url: 'https://openmark.cc/d/abc1234' });

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await handlers.openmark_create_doc({ content: '# Hello', title: 'My Doc' });

      expect(mockClient.createDoc).toHaveBeenCalledWith('# Hello', 'My Doc');
    });

    it('calls createDoc without title when not provided', async () => {
      mockClient.createDoc.mockResolvedValueOnce({ slug: 'abc1234', url: 'https://openmark.cc/d/abc1234' });

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await handlers.openmark_create_doc({ content: '# Hello' });

      expect(mockClient.createDoc).toHaveBeenCalledWith('# Hello', undefined);
    });
  });

  describe('openmark_read_doc', () => {
    it('returns formatted title, URL, and content', async () => {
      mockClient.readDoc.mockResolvedValueOnce({
        slug: 'abc1234',
        title: 'My Doc',
        content: '# Hello',
        url: 'https://openmark.cc/d/abc1234',
      });

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_read_doc({ slug: 'abc1234' });

      expect(result).toContain('My Doc');
      expect(result).toContain('https://openmark.cc/d/abc1234');
      expect(result).toContain('# Hello');
    });

    it('throws Zod error when slug is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_read_doc({})).rejects.toThrow();
    });
  });

  describe('openmark_update_doc', () => {
    it('returns "Updated: <url>" on success', async () => {
      mockClient.updateDoc.mockResolvedValueOnce({ slug: 'abc1234', url: 'https://openmark.cc/d/abc1234' });

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_update_doc({ slug: 'abc1234', content: '# Updated' });

      expect(result).toContain('Updated:');
      expect(result).toContain('abc1234');
    });

    it('throws Zod error when slug is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_update_doc({ content: '# Updated' })).rejects.toThrow();
    });

    it('throws Zod error when content is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_update_doc({ slug: 'abc1234' })).rejects.toThrow();
    });
  });
});
