import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  docJsonCacheUrl,
  docPageCacheUrl,
  ogImageCacheUrl,
  toCacheKeyRequest,
  invalidateDocCaches,
} from './docCacheKeys';

describe('docJsonCacheUrl', () => {
  it('builds the doc-JSON API URL for a given origin and slug', () => {
    expect(docJsonCacheUrl('https://openmark.cc', 'abc1234')).toBe('https://openmark.cc/api/docs/abc1234');
  });
});

describe('docPageCacheUrl', () => {
  it('builds the doc-page URL for a given origin and slug', () => {
    expect(docPageCacheUrl('https://openmark.cc', 'abc1234')).toBe('https://openmark.cc/d/abc1234');
  });
});

describe('ogImageCacheUrl', () => {
  it('builds the OG image URL for a given origin and slug', () => {
    expect(ogImageCacheUrl('https://openmark.cc', 'abc1234')).toBe('https://openmark.cc/api/og/abc1234.png');
  });
});

describe('toCacheKeyRequest', () => {
  it('wraps a URL string in a GET Request usable as a Cache API key', () => {
    const request = toCacheKeyRequest('https://openmark.cc/api/docs/abc1234');
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://openmark.cc/api/docs/abc1234');
  });
});

describe('invalidateDocCaches', () => {
  const mockCache = {
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
  };

  Object.defineProperty(global, 'caches', {
    value: { default: mockCache },
    writable: true,
    configurable: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.delete.mockResolvedValue(true);
  });

  it('deletes all three per-slug cache keys', async () => {
    await invalidateDocCaches('https://openmark.cc', 'abc1234');

    expect(mockCache.delete).toHaveBeenCalledTimes(3);
    const deletedUrls = mockCache.delete.mock.calls.map(([req]) => (req as Request).url);
    expect(deletedUrls).toContain('https://openmark.cc/api/docs/abc1234');
    expect(deletedUrls).toContain('https://openmark.cc/d/abc1234');
    expect(deletedUrls).toContain('https://openmark.cc/api/og/abc1234.png');
  });

  it('does not throw when a cache delete rejects', async () => {
    mockCache.delete.mockRejectedValueOnce(new Error('cache unavailable'));

    await expect(invalidateDocCaches('https://openmark.cc', 'abc1234')).resolves.toBeUndefined();
  });
});
