import { describe, it, expect } from 'vitest';
import { getSlugFromPath } from './route';

describe('getSlugFromPath', () => {
  it('returns null on root path', () => {
    expect(getSlugFromPath('/mreader/')).toBeNull();
  });

  it('returns null on /mreader with no trailing slash', () => {
    expect(getSlugFromPath('/mreader')).toBeNull();
  });

  it('returns null on unrelated path', () => {
    expect(getSlugFromPath('/')).toBeNull();
  });

  it('returns slug on /mreader/d/:slug', () => {
    expect(getSlugFromPath('/mreader/d/abc1234')).toBe('abc1234');
  });

  it('returns null when /mreader/d/ has no slug', () => {
    expect(getSlugFromPath('/mreader/d/')).toBeNull();
  });

  it('returns null for paths that do not start with /mreader/d/', () => {
    expect(getSlugFromPath('/mreader/api/docs')).toBeNull();
  });

  it('reads window.location.pathname when no argument provided', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/mreader/d/xyz9999' },
      writable: true,
    });
    expect(getSlugFromPath()).toBe('xyz9999');
  });
});
