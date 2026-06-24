import { describe, it, expect } from 'vitest';
import { readMdFile, extractTitle, MdFileError } from './mdFileReader';

const MAX_BYTES = 1_048_576;

function makeFile(name: string, content: string, sizeOverride?: number): File {
  const file = new File([content], name, { type: 'text/markdown' });
  // jsdom's File.text() may not work — polyfill it
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(content) });
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeOverride });
  }
  return file;
}

// ---------------------------------------------------------------------------
// extractTitle
// ---------------------------------------------------------------------------

describe('extractTitle', () => {
  it('returns the first # heading text', () => {
    expect(extractTitle('# Hello World\n\nSome text')).toBe('Hello World');
  });

  it('returns null when no # heading is present', () => {
    expect(extractTitle('No heading here')).toBeNull();
  });

  it('ignores ## or deeper headings', () => {
    expect(extractTitle('## Secondary\n# Primary')).toBe('Primary');
  });

  it('trims whitespace from heading text', () => {
    expect(extractTitle('#   Spaced Title   ')).toBe('Spaced Title');
  });

  it('returns null for empty content', () => {
    expect(extractTitle('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// readMdFile
// ---------------------------------------------------------------------------

describe('readMdFile', () => {
  it('reads valid UTF-8 markdown content', async () => {
    const file = makeFile('notes.md', '# Hello\n\nWorld');
    const result = await readMdFile(file);
    expect(result.content).toBe('# Hello\n\nWorld');
  });

  it('extracts title from first # heading', async () => {
    const file = makeFile('notes.md', '# My Title\n\nBody');
    const result = await readMdFile(file);
    expect(result.title).toBe('My Title');
  });

  it('falls back to filename stem when no heading present', async () => {
    const file = makeFile('my-notes.md', 'No heading here');
    const result = await readMdFile(file);
    expect(result.title).toBe('my-notes');
  });

  it('handles empty file — returns empty content, title from filename', async () => {
    const file = makeFile('empty.md', '');
    const result = await readMdFile(file);
    expect(result.content).toBe('');
    expect(result.title).toBe('empty');
  });

  it('strips the .markdown extension from title fallback', async () => {
    const file = makeFile('readme.markdown', 'No heading');
    const result = await readMdFile(file);
    expect(result.title).toBe('readme');
  });

  it('throws MdFileError FILE_TOO_LARGE for files > 1 MB', async () => {
    const file = makeFile('big.md', 'x', MAX_BYTES + 1);
    await expect(readMdFile(file)).rejects.toSatisfy(
      (e: unknown) => e instanceof MdFileError && (e as MdFileError).code === 'FILE_TOO_LARGE',
    );
  });

  it('throws MdFileError INVALID_FILE_TYPE for non-md files', async () => {
    const file = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    await expect(readMdFile(file)).rejects.toSatisfy(
      (e: unknown) => e instanceof MdFileError && (e as MdFileError).code === 'INVALID_FILE_TYPE',
    );
  });
});
