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
  listComments: vi.fn(),
  resolveComment: vi.fn(),
  deleteComment: vi.fn(),
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

  describe('openmark_list_comments', () => {
    it('returns a formatted digest with one line per comment', async () => {
      mockClient.listComments.mockResolvedValueOnce([
        { id: 'c1', authorName: 'Alice', content: 'Fix the typo here', anchorText: 'the itnro', resolved: false, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'c2', authorName: 'Bob', content: 'Looks good', anchorText: null, resolved: true, createdAt: '2026-01-02T00:00:00.000Z' },
      ]);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_list_comments({ slug: 'abc1234' });

      expect(result).toContain('c1');
      expect(result).toContain('Alice');
      expect(result).toContain('Fix the typo here');
      expect(result).toContain('c2');
      expect(result).toContain('Bob');
      expect(result).toContain('resolved');
    });

    it('includes the anchored text so an agent can locate the comment in the doc content', async () => {
      mockClient.listComments.mockResolvedValueOnce([
        { id: 'c1', authorName: 'Alice', content: 'Fix the typo here', anchorText: 'the itnro', resolved: false, createdAt: '2026-01-01T00:00:00.000Z' },
      ]);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_list_comments({ slug: 'abc1234' });

      expect(result).toContain('the itnro');
    });

    it('omits an anchor marker for comments with no anchored text', async () => {
      mockClient.listComments.mockResolvedValueOnce([
        { id: 'c1', authorName: 'Alice', content: 'General feedback', anchorText: null, resolved: false, createdAt: '2026-01-01T00:00:00.000Z' },
      ]);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_list_comments({ slug: 'abc1234' });

      expect(result).toContain('[c1] open — Alice: General feedback');
      expect(result).not.toContain('on:');
    });

    it('returns a message when there are no comments', async () => {
      mockClient.listComments.mockResolvedValueOnce([]);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_list_comments({ slug: 'abc1234' });

      expect(result).toMatch(/no comments/i);
    });

    it('throws Zod error when slug is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_list_comments({})).rejects.toThrow();
    });
  });

  describe('openmark_resolve_comment', () => {
    it('resolves a comment and returns a confirmation', async () => {
      mockClient.resolveComment.mockResolvedValueOnce(undefined);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_resolve_comment({ slug: 'abc1234', commentId: 'c1', resolved: true });

      expect(mockClient.resolveComment).toHaveBeenCalledWith('abc1234', 'c1', true);
      expect(result).toContain('c1');
      expect(result).toMatch(/resolved/i);
    });

    it('unresolves a comment when resolved is false', async () => {
      mockClient.resolveComment.mockResolvedValueOnce(undefined);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_resolve_comment({ slug: 'abc1234', commentId: 'c1', resolved: false });

      expect(mockClient.resolveComment).toHaveBeenCalledWith('abc1234', 'c1', false);
      expect(result).toMatch(/unresolved/i);
    });

    it('throws Zod error when commentId is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_resolve_comment({ slug: 'abc1234', resolved: true })).rejects.toThrow();
    });

    it('throws Zod error when resolved is not a boolean', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_resolve_comment({ slug: 'abc1234', commentId: 'c1', resolved: 'yes' })).rejects.toThrow();
    });
  });

  describe('openmark_delete_comment', () => {
    it('deletes a comment and returns a confirmation', async () => {
      mockClient.deleteComment.mockResolvedValueOnce(undefined);

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      const result = await handlers.openmark_delete_comment({ slug: 'abc1234', commentId: 'c1' });

      expect(mockClient.deleteComment).toHaveBeenCalledWith('abc1234', 'c1');
      expect(result).toContain('Deleted comment c1');
    });

    it('throws Zod error when commentId is missing', async () => {
      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_delete_comment({ slug: 'abc1234' })).rejects.toThrow();
    });

    it('propagates a non-2xx error from the client (e.g. forbidden)', async () => {
      mockClient.deleteComment.mockRejectedValueOnce(new Error('403: Forbidden'));

      const handlers = buildToolHandlers(mockClient as unknown as OpenMarkClient);
      await expect(handlers.openmark_delete_comment({ slug: 'abc1234', commentId: 'c1' })).rejects.toThrow('403');
    });
  });
});
