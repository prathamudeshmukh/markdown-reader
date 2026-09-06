import { describe, it, expect } from 'vitest';
import { isImageFile, isImageTooLarge, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from './imageFile';

function makeFile(name: string, type: string, size = 1): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('isImageFile', () => {
  it.each(ALLOWED_IMAGE_TYPES)('returns true for allowed type %s', (type) => {
    expect(isImageFile(makeFile('photo', type))).toBe(true);
  });

  it('returns false for an unsupported type', () => {
    expect(isImageFile(makeFile('diagram.svg', 'image/svg+xml'))).toBe(false);
  });

  it('returns false for a non-image type', () => {
    expect(isImageFile(makeFile('doc.pdf', 'application/pdf'))).toBe(false);
  });
});

describe('isImageTooLarge', () => {
  it('returns false at exactly the size limit', () => {
    expect(isImageTooLarge(makeFile('photo.png', 'image/png', MAX_IMAGE_BYTES))).toBe(false);
  });

  it('returns true one byte over the size limit', () => {
    expect(isImageTooLarge(makeFile('photo.png', 'image/png', MAX_IMAGE_BYTES + 1))).toBe(true);
  });
});
