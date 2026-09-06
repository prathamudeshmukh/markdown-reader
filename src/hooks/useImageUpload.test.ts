import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/imageApiClient', () => ({
  uploadImage: vi.fn(),
  ImageApiError: class ImageApiError extends Error {
    code: string;
    userMessage: string;
    constructor(code: string) {
      super(code);
      this.code = code;
      this.userMessage = `mock:${code}`;
    }
  },
}));

vi.mock('../telemetry', () => ({
  track: vi.fn(),
}));

import { uploadImage, ImageApiError } from '../api/imageApiClient';
import { track } from '../telemetry';
import { useImageUpload } from './useImageUpload';

function makeFile(name = 'photo.png', type = 'image/png', size = 1): File {
  return new File([new Uint8Array(size)], name, { type });
}

function setup(overrides?: Partial<{ slug: string | null; canEdit: boolean }>) {
  const setMarkdownText = vi.fn();
  const setError = vi.fn();
  const markdownTextRef = { current: 'hello world' };
  const editorRef = { current: { selectionStart: 5 } as unknown as HTMLTextAreaElement };

  // setMarkdownText should keep markdownTextRef in sync, the way App.tsx would.
  setMarkdownText.mockImplementation((text: string) => {
    markdownTextRef.current = text;
  });

  const { result } = renderHook(() =>
    useImageUpload({
      slug: overrides && 'slug' in overrides ? overrides.slug ?? null : 'abc1234',
      canEdit: overrides?.canEdit ?? true,
      markdownTextRef,
      editorRef,
      setMarkdownText,
      setError,
    }),
  );

  return { result, setMarkdownText, setError, markdownTextRef };
}

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a save-first error and inserts nothing when there is no slug', () => {
    const { result, setMarkdownText, setError } = setup({ slug: null });

    act(() => {
      result.current.handleImageDrop([makeFile()]);
    });

    expect(setError).toHaveBeenCalledWith('Save your document before adding images.');
    expect(setMarkdownText).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('does nothing when canEdit is false', () => {
    const { result, setMarkdownText, setError } = setup({ canEdit: false });

    act(() => {
      result.current.handleImageDrop([makeFile()]);
    });

    expect(setError).not.toHaveBeenCalled();
    expect(setMarkdownText).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('skips a non-image file without inserting a placeholder', () => {
    const { result, setMarkdownText } = setup();

    act(() => {
      result.current.handleImageDrop([makeFile('doc.pdf', 'application/pdf')]);
    });

    expect(setMarkdownText).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('skips an oversized image, shows an error, tracks the failure, and inserts no placeholder', () => {
    const { result, setMarkdownText, setError } = setup();
    const bigFile = makeFile('big.png', 'image/png', 10_000_001);

    act(() => {
      result.current.handleImageDrop([bigFile]);
    });

    expect(setMarkdownText).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('image_upload_failed', { reason: 'too_large' });
    expect(setError).toHaveBeenCalledWith('That image exceeds the 10 MB limit.');
  });

  it('inserts a placeholder immediately, then replaces it with the real link on success', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ url: 'https://cdn.example/photo.png' });
    const { result, setMarkdownText, markdownTextRef } = setup();

    act(() => {
      result.current.handleImageDrop([makeFile('photo.png')]);
    });

    expect(markdownTextRef.current).toContain('![Uploading: photo.png…]');

    await waitFor(() => {
      expect(markdownTextRef.current).toBe('hello![photo](https://cdn.example/photo.png) world');
    });

    expect(track).toHaveBeenCalledWith('image_upload_succeeded', { file_size_bytes: 1 });
    expect(setMarkdownText).toHaveBeenCalled();
  });

  it('removes the placeholder and surfaces an error on upload failure', async () => {
    vi.mocked(uploadImage).mockRejectedValue(new ImageApiError('UPLOAD_FAILED'));
    const { result, setError, markdownTextRef } = setup();

    act(() => {
      result.current.handleImageDrop([makeFile('photo.png')]);
    });

    await waitFor(() => {
      expect(markdownTextRef.current).not.toContain('Uploading');
    });

    expect(setError).toHaveBeenCalledWith('mock:UPLOAD_FAILED');
    expect(track).toHaveBeenCalledWith('image_upload_failed', { reason: 'server_error' });
  });

  it('resolves two simultaneous uploads independently, even with the same filename', async () => {
    vi.mocked(uploadImage)
      .mockResolvedValueOnce({ url: 'https://cdn.example/a.png' })
      .mockResolvedValueOnce({ url: 'https://cdn.example/b.png' });
    const { result, markdownTextRef } = setup();

    act(() => {
      result.current.handleImageDrop([makeFile('photo.png'), makeFile('photo.png')]);
    });

    await waitFor(() => {
      expect(markdownTextRef.current).toBe(
        'hello![photo](https://cdn.example/a.png)\n![photo](https://cdn.example/b.png) world',
      );
    });
  });
});
