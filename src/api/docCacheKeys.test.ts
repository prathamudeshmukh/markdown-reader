import { describe, it, expect } from 'vitest';
import { docJsonCacheUrl, docPageCacheUrl, ogImageCacheUrl, toCacheKeyRequest } from './docCacheKeys';

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
