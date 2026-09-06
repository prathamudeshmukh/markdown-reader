import type { InsertionResult } from './markdownInsertion';

export interface PendingImage {
  id: string;
  filename: string;
  placeholder: string;
}

function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function buildPendingImage(filename: string): PendingImage {
  const id = crypto.randomUUID();
  return {
    id,
    filename,
    placeholder: `![Uploading: ${filename}…](pending:${id})`,
  };
}

export function insertPendingImages(
  value: string,
  position: number,
  images: PendingImage[],
): InsertionResult {
  const block = images.map((image) => image.placeholder).join('\n');
  const before = value.slice(0, position);
  const after = value.slice(position);
  const newValue = before + block + after;
  const cursor = position + block.length;
  return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
}

export function resolvePendingImage(value: string, pending: PendingImage, url: string): string {
  const replacement = `![${stripExtension(pending.filename)}](${url})`;
  return value.replace(pending.placeholder, replacement);
}

export function removePendingImage(value: string, pending: PendingImage): string {
  return value.replace(pending.placeholder, '');
}
