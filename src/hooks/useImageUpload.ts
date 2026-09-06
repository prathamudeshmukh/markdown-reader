import { useCallback } from 'react';
import { uploadImage, ImageApiError, type ImageApiErrorCode } from '../api/imageApiClient';
import { isImageFile, isImageTooLarge } from '../utils/imageFile';
import { buildPendingImage, insertPendingImages, resolvePendingImage, removePendingImage, type PendingImage } from '../utils/imageInsertion';
import { track, type ImageUploadFailureReason } from '../telemetry';

const SAVE_FIRST_MESSAGE = 'Save your document before adding images.';
const TOO_LARGE_MESSAGE = 'That image exceeds the 10 MB limit.';

const FAILURE_REASON_BY_CODE: Record<ImageApiErrorCode, ImageUploadFailureReason> = {
  INVALID_TYPE: 'invalid_type',
  FORBIDDEN: 'forbidden',
  TOO_LARGE: 'too_large',
  UPLOAD_FAILED: 'server_error',
  NETWORK_ERROR: 'network_error',
};

export interface DropCoords {
  clientX: number;
  clientY: number;
}

interface UseImageUploadOptions {
  slug: string | null;
  canEdit: boolean;
  markdownTextRef: React.MutableRefObject<string>;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  setMarkdownText: (text: string) => void;
  setError: (message: string | null) => void;
}

function computeInsertPosition(
  markdownText: string,
  editorRef: React.RefObject<HTMLTextAreaElement | null>,
  coords?: DropCoords,
): number {
  if (coords && typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(coords.clientX, coords.clientY);
    if (range && editorRef.current?.contains(range.startContainer)) {
      return range.startOffset;
    }
  }
  if (editorRef.current) return editorRef.current.selectionStart;
  return markdownText.length;
}

export function useImageUpload({
  slug,
  canEdit,
  markdownTextRef,
  editorRef,
  setMarkdownText,
  setError,
}: UseImageUploadOptions) {
  const handleImageDrop = useCallback(
    (files: File[], coords?: DropCoords) => {
      if (!slug) {
        setError(SAVE_FIRST_MESSAGE);
        return;
      }
      if (!canEdit) return;

      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) return;

      const uploadable: { file: File; pending: PendingImage }[] = [];
      let hasOversizedFile = false;
      for (const file of imageFiles) {
        if (isImageTooLarge(file)) {
          hasOversizedFile = true;
          track('image_upload_failed', { reason: 'too_large' });
          continue;
        }
        uploadable.push({ file, pending: buildPendingImage(file.name) });
      }
      if (hasOversizedFile) setError(TOO_LARGE_MESSAGE);
      if (uploadable.length === 0) return;

      const position = computeInsertPosition(markdownTextRef.current, editorRef, coords);
      const { newValue } = insertPendingImages(
        markdownTextRef.current,
        position,
        uploadable.map((u) => u.pending),
      );
      // Mirror into the ref synchronously — App.tsx only syncs markdownTextRef from
      // markdownText via a useEffect, which runs one render behind. Without this,
      // two uploads resolving within the same tick each read a stale pre-render
      // snapshot and clobber each other's placeholder resolution.
      markdownTextRef.current = newValue;
      setMarkdownText(newValue);

      for (const { file, pending } of uploadable) {
        uploadImage(file, slug)
          .then(({ url }) => {
            const resolved = resolvePendingImage(markdownTextRef.current, pending, url);
            markdownTextRef.current = resolved;
            setMarkdownText(resolved);
            track('image_upload_succeeded', { file_size_bytes: file.size });
          })
          .catch((err: unknown) => {
            const removed = removePendingImage(markdownTextRef.current, pending);
            markdownTextRef.current = removed;
            setMarkdownText(removed);
            const code = err instanceof ImageApiError ? err.code : 'UPLOAD_FAILED';
            const userMessage = err instanceof ImageApiError ? err.userMessage : 'The image upload failed. Please try again.';
            setError(userMessage);
            track('image_upload_failed', { reason: FAILURE_REASON_BY_CODE[code] });
          });
      }
    },
    [slug, canEdit, markdownTextRef, editorRef, setMarkdownText, setError],
  );

  return { handleImageDrop };
}
