import { describe, it, expect } from 'vitest';
import { extractLeadingH1 } from './mdHeading';

describe('extractLeadingH1', () => {
  it('extracts H1 text and strips it from content', () => {
    const { heading, rest } = extractLeadingH1('# Hello World\n\nSome text');
    expect(heading).toBe('Hello World');
    expect(rest).toBe('Some text');
  });

  it('returns null heading when no H1 is present', () => {
    const { heading, rest } = extractLeadingH1('No heading here');
    expect(heading).toBeNull();
    expect(rest).toBe('No heading here');
  });

  it('returns null heading for empty string', () => {
    const { heading, rest } = extractLeadingH1('');
    expect(heading).toBeNull();
    expect(rest).toBe('');
  });

  it('ignores H2 and deeper headings', () => {
    const { heading, rest } = extractLeadingH1('## Secondary\n\nBody');
    expect(heading).toBeNull();
    expect(rest).toBe('## Secondary\n\nBody');
  });

  it('skips blank lines before the H1', () => {
    const { heading, rest } = extractLeadingH1('\n\n# Hello\n\nBody');
    expect(heading).toBe('Hello');
    expect(rest).toBe('Body');
  });

  it('collapses blank lines immediately after the H1', () => {
    const { heading, rest } = extractLeadingH1('# Hello\n\n\nBody');
    expect(heading).toBe('Hello');
    expect(rest).toBe('Body');
  });

  it('returns empty rest when H1 is the only content', () => {
    const { heading, rest } = extractLeadingH1('# Only Heading');
    expect(heading).toBe('Only Heading');
    expect(rest).toBe('');
  });

  it('does not match ATX heading without space after #', () => {
    const { heading, rest } = extractLeadingH1('#NoSpace\n\nBody');
    expect(heading).toBeNull();
    expect(rest).toBe('#NoSpace\n\nBody');
  });

  it('does not match setext-style H1', () => {
    const { heading, rest } = extractLeadingH1('Hello\n=====\n\nBody');
    expect(heading).toBeNull();
    expect(rest).toBe('Hello\n=====\n\nBody');
  });

  it('trims trailing spaces from heading text', () => {
    const { heading } = extractLeadingH1('# Heading  \n\nBody');
    expect(heading).toBe('Heading');
  });

  it('handles H1 with no trailing content', () => {
    const { heading, rest } = extractLeadingH1('# Title\n');
    expect(heading).toBe('Title');
    expect(rest).toBe('');
  });
});
