import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/route', () => ({ getSlugFromPath: vi.fn() }));
vi.mock('../api/docsApi', () => ({
  fetchDoc: vi.fn(),
  saveDoc: vi.fn(),
  updateDoc: vi.fn(),
}));
vi.mock('../utils/recentDocs', () => ({ addRecentDoc: vi.fn() }));
vi.mock('../realtime/useDocChannel', () => ({
  useDocChannel: vi.fn(() => ({ broadcastContent: vi.fn(), presenceCount: 1 })),
}));

import { useMarkdownState } from './useMarkdownState';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';
import { addRecentDoc } from '../utils/recentDocs';

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { replace: vi.fn(), pathname: '/mreader/' },
    writable: true,
  });
});

describe('useMarkdownState', () => {
  describe('root page (no slug)', () => {
    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue(null);
    });

    it('starts with empty text, not loading, no error', () => {
      const { result } = renderHook(() => useMarkdownState());
      expect(result.current.markdownText).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.slug).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('does not call fetchDoc on mount', () => {
      renderHook(() => useMarkdownState());
      expect(fetchDoc).not.toHaveBeenCalled();
    });

    it('updates markdownText without calling updateDoc', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useMarkdownState());

      act(() => result.current.setMarkdownText('# Hello'));
      act(() => vi.runAllTimers());

      expect(result.current.markdownText).toBe('# Hello');
      expect(updateDoc).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('onSave does nothing when text is empty', async () => {
      const { result } = renderHook(() => useMarkdownState());
      await act(() => result.current.onSave());
      expect(saveDoc).not.toHaveBeenCalled();
    });

    it('onSave calls saveDoc and redirects on success', async () => {
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234' });
      const { result } = renderHook(() => useMarkdownState());

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(saveDoc).toHaveBeenCalledWith('# Hello');
      expect(addRecentDoc).toHaveBeenCalledWith('new1234');
      expect(window.location.replace).toHaveBeenCalledWith('/mreader/d/new1234');
    });

    it('onSave sets error on failure', async () => {
      vi.mocked(saveDoc).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useMarkdownState());

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(result.current.error).toBe('Network error');
      expect(result.current.isSaving).toBe(false);
    });

    it('toggleMode switches between editor and preview', () => {
      const { result } = renderHook(() => useMarkdownState());
      expect(result.current.mode).toBe('editor');

      act(() => result.current.toggleMode());
      expect(result.current.mode).toBe('preview');

      act(() => result.current.toggleMode());
      expect(result.current.mode).toBe('editor');
    });
  });

  describe('doc page (with slug)', () => {
    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue('abc1234');
    });

    it('starts in loading state with correct slug', () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello' });
      const { result } = renderHook(() => useMarkdownState());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.slug).toBe('abc1234');
    });

    it('fetches doc and populates markdownText', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello' });
      const { result } = renderHook(() => useMarkdownState());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.markdownText).toBe('# Hello');
      expect(fetchDoc).toHaveBeenCalledWith('abc1234');
      expect(addRecentDoc).toHaveBeenCalledWith('abc1234');
    });

    it('sets error when fetch fails', async () => {
      vi.mocked(fetchDoc).mockRejectedValueOnce(new Error('Not found'));
      const { result } = renderHook(() => useMarkdownState());

      await waitFor(() => expect(result.current.error).toBe('Not found'));
      expect(result.current.isLoading).toBe(false);
    });

    it('calls updateDoc debounced on text change', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello' });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkdownState());
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Updated'));
      expect(updateDoc).not.toHaveBeenCalled();

      await act(() => vi.runAllTimersAsync());
      expect(updateDoc).toHaveBeenCalledWith('abc1234', '# Updated');
      vi.useRealTimers();
    });

    it('sets error when updateDoc fails', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello' });
      vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useMarkdownState());
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Updated'));
      await act(() => vi.runAllTimersAsync());

      expect(result.current.error).toBe('Save failed');
      vi.useRealTimers();
    });
  });
});
