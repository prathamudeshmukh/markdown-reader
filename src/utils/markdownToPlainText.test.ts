import { describe, it, expect } from 'vitest';
import { markdownToPlainText } from './markdownToPlainText';

describe('markdownToPlainText', () => {
  it('strips heading markers', () => {
    expect(markdownToPlainText('# Title\n\n## Subtitle')).toBe('Title Subtitle');
  });

  it('strips bold and italic markers', () => {
    expect(markdownToPlainText('This is **bold** and *italic* and __also bold__ and _also italic_')).toBe(
      'This is bold and italic and also bold and also italic',
    );
  });

  it('strips link syntax, keeping the link text', () => {
    expect(markdownToPlainText('Check out [Openmark](https://openmark.cc) today')).toBe(
      'Check out Openmark today',
    );
  });

  it('strips inline code backticks, keeping the code text', () => {
    expect(markdownToPlainText('Run `npm install` to set up')).toBe('Run npm install to set up');
  });

  it('strips code fence delimiters, keeping the code content', () => {
    expect(markdownToPlainText('Before\n```ts\nconst x = 1;\n```\nAfter')).toBe('Before const x = 1; After');
  });

  it('strips blockquote markers', () => {
    expect(markdownToPlainText('> A quoted line')).toBe('A quoted line');
  });

  it('strips unordered list markers', () => {
    expect(markdownToPlainText('- first\n- second\n* third')).toBe('first second third');
  });

  it('strips ordered list markers', () => {
    expect(markdownToPlainText('1. first\n2. second')).toBe('first second');
  });

  it('collapses multiple blank lines and repeated whitespace into single spaces', () => {
    expect(markdownToPlainText('Line one\n\n\n\nLine two   with   spaces')).toBe('Line one Line two with spaces');
  });

  it('trims leading and trailing whitespace', () => {
    expect(markdownToPlainText('  \n  Hello  \n  ')).toBe('Hello');
  });

  it('returns an empty string for empty input', () => {
    expect(markdownToPlainText('')).toBe('');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(markdownToPlainText('   \n\n   ')).toBe('');
  });
});
