import { describe, it, expect } from 'vitest';
import {
  buildPendingImage,
  insertPendingImages,
  resolvePendingImage,
  removePendingImage,
} from './imageInsertion';

describe('buildPendingImage', () => {
  it('builds a placeholder containing the filename and a pending:<id> URL slot', () => {
    const pending = buildPendingImage('photo.png');
    expect(pending.filename).toBe('photo.png');
    expect(pending.placeholder).toBe(`![Uploading: photo.png…](pending:${pending.id})`);
  });

  it('gives two calls distinct ids even for the same filename', () => {
    const a = buildPendingImage('photo.png');
    const b = buildPendingImage('photo.png');
    expect(a.id).not.toBe(b.id);
    expect(a.placeholder).not.toBe(b.placeholder);
  });
});

describe('insertPendingImages', () => {
  it('inserts a single placeholder at the given position', () => {
    const pending = buildPendingImage('photo.png');
    const result = insertPendingImages('before after', 6, [pending]);
    expect(result.newValue).toBe(`before${pending.placeholder} after`);
  });

  it('inserts at position 0', () => {
    const pending = buildPendingImage('photo.png');
    const result = insertPendingImages('rest', 0, [pending]);
    expect(result.newValue).toBe(`${pending.placeholder}rest`);
  });

  it('inserts at the end of the string', () => {
    const pending = buildPendingImage('photo.png');
    const result = insertPendingImages('rest', 4, [pending]);
    expect(result.newValue).toBe(`rest${pending.placeholder}`);
  });

  it('joins multiple placeholders with a newline in one block', () => {
    const a = buildPendingImage('a.png');
    const b = buildPendingImage('b.png');
    const result = insertPendingImages('text', 4, [a, b]);
    expect(result.newValue).toBe(`text${a.placeholder}\n${b.placeholder}`);
  });

  it('places the cursor after the inserted block', () => {
    const pending = buildPendingImage('photo.png');
    const result = insertPendingImages('text', 4, [pending]);
    expect(result.newCursorStart).toBe(4 + pending.placeholder.length);
    expect(result.newCursorEnd).toBe(result.newCursorStart);
  });
});

describe('resolvePendingImage', () => {
  it('replaces only the matching placeholder', () => {
    const value = 'x';
    const pending = buildPendingImage('photo.png');
    const withPlaceholder = `${value}${pending.placeholder}y`;
    const result = resolvePendingImage(withPlaceholder, pending, 'https://cdn.example/photo.png');
    expect(result).toBe('x![photo](https://cdn.example/photo.png)y');
  });

  it('replaces only the placeholder matching its own id when two files share a filename', () => {
    const a = buildPendingImage('photo.png');
    const b = buildPendingImage('photo.png');
    const value = `${a.placeholder}\n${b.placeholder}`;

    const afterA = resolvePendingImage(value, a, 'https://cdn.example/a.png');
    expect(afterA).toBe(`![photo](https://cdn.example/a.png)\n${b.placeholder}`);

    const afterBoth = resolvePendingImage(afterA, b, 'https://cdn.example/b.png');
    expect(afterBoth).toBe('![photo](https://cdn.example/a.png)\n![photo](https://cdn.example/b.png)');
  });

  it('strips the file extension from the alt text', () => {
    const pending = buildPendingImage('vacation-photo.jpeg');
    const result = resolvePendingImage(pending.placeholder, pending, 'https://cdn.example/x.jpeg');
    expect(result).toBe('![vacation-photo](https://cdn.example/x.jpeg)');
  });
});

describe('removePendingImage', () => {
  it('removes the placeholder substring, leaving surrounding text intact', () => {
    const pending = buildPendingImage('photo.png');
    const value = `before ${pending.placeholder} after`;
    expect(removePendingImage(value, pending)).toBe('before  after');
  });

  it('removes only the matching placeholder when two share a filename', () => {
    const a = buildPendingImage('photo.png');
    const b = buildPendingImage('photo.png');
    const value = `${a.placeholder}\n${b.placeholder}`;
    expect(removePendingImage(value, a)).toBe(`\n${b.placeholder}`);
  });

  it('is a no-op if the placeholder is not present', () => {
    const pending = buildPendingImage('photo.png');
    expect(removePendingImage('unrelated text', pending)).toBe('unrelated text');
  });
});
