import { describe, it, expect } from 'vitest';
import {
  applyBold,
  applyItalic,
  applyCode,
  applyHeading,
  applyQuote,
  applyList,
  applyLink,
  applyTable,
} from './markdownInsertion';

// ── applyBold ──────────────────────────────────────────────────────────────

describe('applyBold', () => {
  it('no selection: inserts bold template at cursor', () => {
    const result = applyBold('hello world', 5, 5);
    expect(result.newValue).toBe('hello**** world');
    // cursor lands inside the ** delimiters (after opening **)
    expect(result.newCursorStart).toBe(7);
    expect(result.newCursorEnd).toBe(7);
  });

  it('with selection: wraps selected text in bold', () => {
    const result = applyBold('hello world', 6, 11);
    expect(result.newValue).toBe('hello **world**');
    expect(result.newCursorStart).toBe(15);
    expect(result.newCursorEnd).toBe(15);
  });

  it('cursor at start of document', () => {
    const result = applyBold('text', 0, 0);
    expect(result.newValue).toBe('****text');
    expect(result.newCursorStart).toBe(2);
  });
});

// ── applyItalic ────────────────────────────────────────────────────────────

describe('applyItalic', () => {
  it('no selection: inserts italic template at cursor', () => {
    const result = applyItalic('hello world', 5, 5);
    expect(result.newValue).toBe('hello__ world');
    expect(result.newCursorStart).toBe(6);
    expect(result.newCursorEnd).toBe(6);
  });

  it('with selection: wraps selected text in italic', () => {
    const result = applyItalic('hello world', 6, 11);
    expect(result.newValue).toBe('hello _world_');
    expect(result.newCursorStart).toBe(13);
    expect(result.newCursorEnd).toBe(13);
  });
});

// ── applyCode ─────────────────────────────────────────────────────────────

describe('applyCode', () => {
  it('no selection: inserts code template at cursor', () => {
    const result = applyCode('hello world', 5, 5);
    expect(result.newValue).toBe('hello`` world');
    expect(result.newCursorStart).toBe(6);
    expect(result.newCursorEnd).toBe(6);
  });

  it('with selection: wraps selected text in backticks', () => {
    const result = applyCode('hello world', 6, 11);
    expect(result.newValue).toBe('hello `world`');
    expect(result.newCursorStart).toBe(13);
    expect(result.newCursorEnd).toBe(13);
  });
});

// ── applyHeading ──────────────────────────────────────────────────────────

describe('applyHeading', () => {
  it('cursor in middle of line: adds ## prefix at line start', () => {
    const result = applyHeading('hello world', 5, 5);
    expect(result.newValue).toBe('## hello world');
    // cursor moves right by prefix length (3 chars: "## ")
    expect(result.newCursorStart).toBe(8);
    expect(result.newCursorEnd).toBe(8);
  });

  it('cursor at start of line: adds ## prefix', () => {
    const result = applyHeading('hello', 0, 0);
    expect(result.newValue).toBe('## hello');
    expect(result.newCursorStart).toBe(3);
  });

  it('multiline: only prefixes the line containing the cursor', () => {
    const value = 'first line\nsecond line\nthird line';
    const result = applyHeading(value, 15, 15); // cursor on "second line"
    expect(result.newValue).toBe('first line\n## second line\nthird line');
  });

  it('does not double-prefix already-headed line', () => {
    const result = applyHeading('## already', 5, 5);
    expect(result.newValue).toBe('## ## already');
  });
});

// ── applyQuote ────────────────────────────────────────────────────────────

describe('applyQuote', () => {
  it('cursor in middle of line: adds > prefix at line start', () => {
    const result = applyQuote('hello world', 5, 5);
    expect(result.newValue).toBe('> hello world');
    expect(result.newCursorStart).toBe(7);
  });

  it('multiline: only prefixes the line containing the cursor', () => {
    const value = 'line one\nline two';
    const result = applyQuote(value, 10, 10); // cursor on "line two"
    expect(result.newValue).toBe('line one\n> line two');
  });
});

// ── applyList ─────────────────────────────────────────────────────────────

describe('applyList', () => {
  it('adds - prefix at line start', () => {
    const result = applyList('hello world', 5, 5);
    expect(result.newValue).toBe('- hello world');
    expect(result.newCursorStart).toBe(7);
  });

  it('multiline: only prefixes the line containing the cursor', () => {
    const value = 'line one\nline two';
    const result = applyList(value, 10, 10);
    expect(result.newValue).toBe('line one\n- line two');
  });
});

// ── applyLink ─────────────────────────────────────────────────────────────

describe('applyLink', () => {
  it('no selection, no params: inserts link template with cursor inside ()', () => {
    const result = applyLink('hello ', 6, 6);
    expect(result.newValue).toBe('hello [text]()');
    // cursor inside ()
    expect(result.newCursorStart).toBe(13);
    expect(result.newCursorEnd).toBe(13);
  });

  it('with selection: wraps selection, cursor inside ()', () => {
    const result = applyLink('hello world', 6, 11);
    expect(result.newValue).toBe('hello [world]()');
    expect(result.newCursorStart).toBe(14);
    expect(result.newCursorEnd).toBe(14);
  });

  it('no selection, with linkText and url: inserts complete link', () => {
    const result = applyLink('', 0, 0, 'OpenAI', 'https://openai.com');
    expect(result.newValue).toBe('[OpenAI](https://openai.com)');
    expect(result.newCursorStart).toBe(28);
  });
});

// ── applyTable ────────────────────────────────────────────────────────────

describe('applyTable', () => {
  it('inserts a 2-column 2-row GFM table (1 header + 1 data)', () => {
    const result = applyTable('', 0, 2, 2);
    const expected = '| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n|  |  |';
    expect(result.newValue).toBe(expected);
  });

  it('inserts a 3-column 2-row GFM table', () => {
    const result = applyTable('', 0, 2, 3);
    const lines = result.newValue.split('\n');
    expect(lines[0]).toBe('| Column 1 | Column 2 | Column 3 |');
    expect(lines[1]).toBe('| --- | --- | --- |');
    expect(lines[2]).toBe('|  |  |  |');
  });

  it('rows param controls data rows (rows=3 → 1 header + 3 data)', () => {
    const result = applyTable('', 0, 3, 2);
    const lines = result.newValue.split('\n');
    // header + separator + 3 data rows = 5 lines
    expect(lines).toHaveLength(5);
  });

  it('inserts at cursor position in existing text', () => {
    const result = applyTable('before\n', 7, 2, 2);
    expect(result.newValue.startsWith('before\n')).toBe(true);
    expect(result.newValue).toContain('| Column 1 |');
  });

  it('cursor placed at end of inserted table', () => {
    const result = applyTable('', 0, 2, 2);
    expect(result.newCursorStart).toBe(result.newValue.length);
    expect(result.newCursorEnd).toBe(result.newValue.length);
  });
});
