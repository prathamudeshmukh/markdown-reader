import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readRecentDocs, addRecentDoc } from './recentDocs';

const STORAGE_KEY = 'mreader:recentDocs';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readRecentDocs', () => {
  it('returns [] when localStorage is empty', () => {
    expect(readRecentDocs()).toEqual([]);
  });

  it('returns parsed array of valid entries', () => {
    const data = [
      { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
      { slug: 'xyz9999', savedAt: '2026-03-11T09:12:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(readRecentDocs()).toEqual(data);
  });

  it('returns [] on invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    expect(readRecentDocs()).toEqual([]);
  });

  it('returns [] when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: 'abc1234' }));
    expect(readRecentDocs()).toEqual([]);
  });

  it('filters out entries missing slug', () => {
    const data = [
      { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
      { savedAt: '2026-03-11T09:12:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(readRecentDocs()).toEqual([{ slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' }]);
  });

  it('filters out entries missing savedAt', () => {
    const data = [
      { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
      { slug: 'xyz9999' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(readRecentDocs()).toEqual([{ slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' }]);
  });

  it('filters out entries where slug is not a string', () => {
    const data = [
      { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
      { slug: 123, savedAt: '2026-03-11T09:12:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(readRecentDocs()).toEqual([{ slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' }]);
  });
});

describe('addRecentDoc', () => {
  it('prepends a new entry to an empty list', () => {
    const result = addRecentDoc('abc1234');
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('abc1234');
    expect(typeof result[0].savedAt).toBe('string');
  });

  it('persists the new entry to localStorage', () => {
    addRecentDoc('abc1234');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored[0].slug).toBe('abc1234');
  });

  it('prepends to front of existing list', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ slug: 'old1111', savedAt: '2026-03-10T00:00:00.000Z' }]),
    );
    const result = addRecentDoc('new2222');
    expect(result[0].slug).toBe('new2222');
    expect(result[1].slug).toBe('old1111');
  });

  it('deduplicates: moves existing slug to front with new timestamp', () => {
    const oldTime = '2026-03-10T00:00:00.000Z';
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { slug: 'abc1234', savedAt: oldTime },
        { slug: 'other11', savedAt: oldTime },
      ]),
    );

    const before = Date.now();
    const result = addRecentDoc('abc1234');
    const after = Date.now();

    expect(result[0].slug).toBe('abc1234');
    expect(result).toHaveLength(2);
    expect(result[1].slug).toBe('other11');

    const savedAt = new Date(result[0].savedAt).getTime();
    expect(savedAt).toBeGreaterThanOrEqual(before);
    expect(savedAt).toBeLessThanOrEqual(after);
  });

  it('keeps all entries with no cap', () => {
    const existing = Array.from({ length: 20 }, (_, i) => ({
      slug: `slug${i.toString().padStart(4, '0')}`,
      savedAt: '2026-03-10T00:00:00.000Z',
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    const result = addRecentDoc('newest01');
    expect(result).toHaveLength(21);
    expect(result[0].slug).toBe('newest01');
    // all existing entries preserved
    expect(result.find((d) => d.slug === 'slug0019')).toBeDefined();
  });

  it('does not mutate the previously read array', () => {
    const data = [{ slug: 'abc1234', savedAt: '2026-03-10T00:00:00.000Z' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const before = readRecentDocs();
    addRecentDoc('xyz9999');
    // the reference returned by readRecentDocs before the add should be unchanged
    expect(before).toHaveLength(1);
  });
});
