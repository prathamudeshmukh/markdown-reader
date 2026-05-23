import { describe, it, expect } from 'vitest';
import { getSlugFromPath } from './route';

describe('getSlugFromPath', () => {
  it('returns null on root path', () => {
    expect(getSlugFromPath('/')).toBeNull();
  });

  it('returns null on unrelated path', () => {
    expect(getSlugFromPath('/api/docs')).toBeNull();
  });

  it('returns slug on /d/:slug', () => {
    expect(getSlugFromPath('/d/abc1234')).toBe('abc1234');
  });

  it('returns null when /d/ has no slug', () => {
    expect(getSlugFromPath('/d/')).toBeNull();
  });

  it('returns null for paths that do not start with /d/', () => {
    expect(getSlugFromPath('/api/docs')).toBeNull();
  });

  it('reads window.location.pathname when no argument provided', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/d/xyz9999' },
      writable: true,
    });
    expect(getSlugFromPath()).toBe('xyz9999');
  });
});
