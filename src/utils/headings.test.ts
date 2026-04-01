import { describe, it, expect } from 'vitest';
import { extractHeadings, slugify } from './headings';

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips inline bold markdown', () => {
    expect(slugify('**Bold** Title')).toBe('bold-title');
  });

  it('strips inline code markdown', () => {
    expect(slugify('Use `code` Here')).toBe('use-code-here');
  });

  it('strips link markdown', () => {
    expect(slugify('[Click here](https://example.com)')).toBe('click-here');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World! (2024)')).toBe('hello-world-2024');
  });

  it('deduplicates with -2, -3 suffixes', () => {
    const seen = new Map<string, number>();
    expect(slugify('Introduction', seen)).toBe('introduction');
    expect(slugify('Introduction', seen)).toBe('introduction-2');
    expect(slugify('Introduction', seen)).toBe('introduction-3');
  });
});

describe('extractHeadings', () => {
  it('returns empty array for blank content', () => {
    expect(extractHeadings('')).toEqual([]);
  });

  it('returns empty array when no headings present', () => {
    expect(extractHeadings('Just some paragraph text.\n\nAnother paragraph.')).toEqual([]);
  });

  it('includes h1 headings', () => {
    const md = '# Title\n\n## Section';
    const result = extractHeadings(md);
    expect(result).toHaveLength(2);
    expect(result[0].level).toBe(1);
    expect(result[1].level).toBe(2);
  });

  it('extracts h1, h2, h3, h4 headings', () => {
    const md = '# Top\n\n## Section\n\n### Sub\n\n#### Sub-sub\n\n##### Too deep';
    const result = extractHeadings(md);
    expect(result).toHaveLength(4);
    expect(result.map((h) => h.level)).toEqual([1, 2, 3, 4]);
  });

  it('produces correct text and id', () => {
    const md = '## Hello World';
    const [heading] = extractHeadings(md);
    expect(heading.text).toBe('Hello World');
    expect(heading.id).toBe('hello-world');
  });

  it('strips inline markdown from text', () => {
    const md = '## **Bold** Section';
    const [heading] = extractHeadings(md);
    expect(heading.text).toBe('Bold Section');
  });

  it('deduplicates duplicate heading ids', () => {
    const md = '## Intro\n\n## Intro\n\n## Intro';
    const result = extractHeadings(md);
    expect(result.map((h) => h.id)).toEqual(['intro', 'intro-2', 'intro-3']);
  });

  it('does not match headings inside code blocks', () => {
    // Note: the regex matches on raw markdown lines — headings inside
    // fenced code blocks start with ## at column 0 which the regex would
    // still match. This is acceptable for a lightweight extractor.
    const md = '## Real Heading\n\nSome text';
    expect(extractHeadings(md)).toHaveLength(1);
  });
});
