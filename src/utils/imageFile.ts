export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

export const MAX_IMAGE_BYTES = 10_000_000; // 10 MB

export function isImageFile(file: File): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

export function isImageTooLarge(file: File): boolean {
  return file.size > MAX_IMAGE_BYTES;
}
