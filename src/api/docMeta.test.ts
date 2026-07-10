import { describe, it, expect } from 'vitest';
import {
  deriveTitle,
  deriveDescription,
  escapeHtmlAttr,
  DESCRIPTION_MAX_LENGTH,
  GENERIC_SITE_DESCRIPTION,
  UNTITLED_DOCUMENT_TITLE,
} from './docMeta';

describe('deriveTitle', () => {
  it('returns the trimmed doc title when present', () => {
    expect(deriveTitle({ title: '  My Doc  ', content: '# Heading' })).toBe('My Doc');
  });

  it('falls back to the leading H1 heading when title is empty', () => {
    expect(deriveTitle({ title: null, content: '# My Heading\n\nBody text' })).toBe('My Heading');
  });

  it('falls back to "Untitled document" when there is no title and no leading heading', () => {
    expect(deriveTitle({ title: null, content: 'Just some prose, no heading.' })).toBe(UNTITLED_DOCUMENT_TITLE);
  });

  it('falls back to the heading when title is whitespace-only', () => {
    expect(deriveTitle({ title: '   ', content: '# Real Title' })).toBe('Real Title');
  });
});

describe('deriveDescription', () => {
  it('returns stripped, truncated plain text for long content', () => {
    const longContent = `# Heading\n\n${'word '.repeat(50)}`;
    const description = deriveDescription({ content: longContent });
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH + 1);
    expect(description.endsWith('…')).toBe(true);
    expect(description).not.toContain('#');
  });

  it('returns the generic site description for empty content', () => {
    expect(deriveDescription({ content: '' })).toBe(GENERIC_SITE_DESCRIPTION);
  });

  it('returns the generic site description for whitespace-only content', () => {
    expect(deriveDescription({ content: '   \n\n   ' })).toBe(GENERIC_SITE_DESCRIPTION);
  });

  it('returns short content as-is, without truncation', () => {
    expect(deriveDescription({ content: 'A short doc.' })).toBe('A short doc.');
  });
});

describe('escapeHtmlAttr', () => {
  it('escapes all five unsafe characters', () => {
    expect(escapeHtmlAttr(`< > & " '`)).toBe('&lt; &gt; &amp; &quot; &#39;');
  });

  it('leaves safe characters untouched', () => {
    expect(escapeHtmlAttr('Just plain text 123')).toBe('Just plain text 123');
  });
});
