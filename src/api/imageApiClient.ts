import { authHeaders } from './authToken';

export type ImageApiErrorCode = 'INVALID_TYPE' | 'FORBIDDEN' | 'TOO_LARGE' | 'UPLOAD_FAILED' | 'NETWORK_ERROR';

const USER_MESSAGES: Record<ImageApiErrorCode, string> = {
  INVALID_TYPE: 'That file type is not supported. Use PNG, JPEG, GIF, or WebP.',
  FORBIDDEN: "You don't have permission to add images to this document.",
  TOO_LARGE: 'That image exceeds the 10 MB limit.',
  UPLOAD_FAILED: 'The image upload failed. Please try again.',
  NETWORK_ERROR: 'Could not reach the server. Check your connection.',
};

export class ImageApiError extends Error {
  readonly code: ImageApiErrorCode;
  readonly userMessage: string;

  constructor(code: ImageApiErrorCode) {
    const userMessage = USER_MESSAGES[code];
    super(userMessage);
    this.name = 'ImageApiError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

function errorCodeForStatus(status: number): ImageApiErrorCode {
  if (status === 400) return 'INVALID_TYPE';
  if (status === 403) return 'FORBIDDEN';
  if (status === 413) return 'TOO_LARGE';
  return 'UPLOAD_FAILED';
}

export async function uploadImage(file: File, slug: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('slug', slug);

  let response: Response;
  try {
    // No Content-Type here on purpose — the browser sets the multipart
    // boundary itself. The bearer token is what lets the Worker match the
    // caller against the doc's owner; without it, uploading to a doc you
    // own (with edit_access off) is rejected as Forbidden.
    response = await fetch('/api/images/upload', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData,
    });
  } catch {
    throw new ImageApiError('NETWORK_ERROR');
  }

  if (!response.ok) {
    throw new ImageApiError(errorCodeForStatus(response.status));
  }

  return (await response.json()) as { url: string };
}
