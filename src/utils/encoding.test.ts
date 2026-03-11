import { describe, it, expect } from 'vitest';
import { encodeMarkdown, decodeMarkdown } from './encoding';

describe('encodeMarkdown / decodeMarkdown', () => {
  it('round-trips plain ASCII text', () => {
    const text = '# Hello\n\nThis is **bold** and _italic_.';
    expect(decodeMarkdown(encodeMarkdown(text))).toBe(text);
  });

  it('round-trips Unicode and emoji', () => {
    const text = '# こんにちは 🎉\n\nEmoji: 🚀 👋';
    expect(decodeMarkdown(encodeMarkdown(text))).toBe(text);
  });

  it('round-trips empty string', () => {
    expect(decodeMarkdown(encodeMarkdown(''))).toBe('');
  });

  it('produces URL-safe characters (no +, /, or =)', () => {
    const encoded = encodeMarkdown('Hello World! This is a test of the encoding system.');
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('throws on invalid Base64 input', () => {
    expect(() => decodeMarkdown('!!!invalid!!!')).toThrow();
  });

  it('round-trips multi-line markdown with code blocks', () => {
    const text = '```js\nconst x = 1;\n```\n\n> blockquote\n\n- item 1\n- item 2';
    expect(decodeMarkdown(encodeMarkdown(text))).toBe(text);
  });
});
