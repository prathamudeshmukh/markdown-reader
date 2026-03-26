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
vi.mock('../telemetry', () => ({
  track: vi.fn(),
  getContentLengthBucket: vi.fn(() => 'xs'),
  getErrorType: vi.fn(() => 'unknown'),
}));

import { useMarkdownState } from './useMarkdownState';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';
import { addRecentDoc } from '../utils/recentDocs';
import { track } from '../telemetry';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  Object.defineProperty(window, 'location', {
    value: { pathname: '/mreader/' },
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
      expect(result.current.title).toBeNull();
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

    it('onSave calls saveDoc, updates URL and slug in-place on success', async () => {
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234' });
      const { result } = renderHook(() => useMarkdownState());

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(saveDoc).toHaveBeenCalledWith({ content: '# Hello', title: undefined });
      expect(addRecentDoc).toHaveBeenCalledWith('new1234', null);
      expect(track).toHaveBeenCalledWith(
        'doc_save_clicked',
        expect.objectContaining({ source: 'button' }),
      );
      expect(track).toHaveBeenCalledWith('doc_save_succeeded', { slug_created: true });
      expect(history.pushState).toHaveBeenCalledWith({}, '', '/mreader/d/new1234');
      expect(result.current.slug).toBe('new1234');
      expect(result.current.mode).toBe('editor');
      expect(result.current.isSaving).toBe(false);
    });

    it('onSave includes title when set', async () => {
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234' });
      const { result } = renderHook(() => useMarkdownState());

      act(() => result.current.setMarkdownText('# Hello'));
      act(() => result.current.setTitle('My Doc'));
      await act(() => result.current.onSave());

      expect(saveDoc).toHaveBeenCalledWith({ content: '# Hello', title: 'My Doc' });
      expect(addRecentDoc).toHaveBeenCalledWith('new1234', 'My Doc');
    });

    it('onSave sets error on failure', async () => {
      vi.mocked(saveDoc).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useMarkdownState());

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(result.current.error).toBe('Network error');
      expect(track).toHaveBeenCalledWith(
        'doc_save_failed',
        expect.objectContaining({ error_type: expect.any(String) }),
      );
      expect(result.current.isSaving).toBe(false);
    });

    it('toggleMode switches between editor and preview', () => {
      const { result } = renderHook(() => useMarkdownState());
      expect(result.current.mode).toBe('editor');

      act(() => result.current.toggleMode());
      expect(result.current.mode).toBe('preview');
      expect(track).toHaveBeenCalledWith(
        'mode_toggled',
        expect.objectContaining({ from_mode: 'editor', to_mode: 'preview', source: 'button' }),
      );

      act(() => result.current.toggleMode());
      expect(result.current.mode).toBe('editor');
    });
  });

  describe('doc page (with slug)', () => {
    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue('abc1234');
    });

    it('starts in loading state with correct slug', () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null });
      const { result } = renderHook(() => useMarkdownState());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.slug).toBe('abc1234');
    });

    it('fetches doc and populates markdownText and title', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: 'My Doc' });
      const { result } = renderHook(() => useMarkdownState());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.markdownText).toBe('# Hello');
      expect(result.current.title).toBe('My Doc');
      expect(fetchDoc).toHaveBeenCalledWith('abc1234');
      expect(addRecentDoc).toHaveBeenCalledWith('abc1234', 'My Doc');
    });

    it('sets error when fetch fails', async () => {
      vi.mocked(fetchDoc).mockRejectedValueOnce(new Error('Not found'));
      const { result } = renderHook(() => useMarkdownState());

      await waitFor(() => expect(result.current.error).toBe('Not found'));
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call fetchDoc while auth is loading', () => {
      renderHook(() => useMarkdownState({ isAuthLoading: true }));
      expect(fetchDoc).not.toHaveBeenCalled();
    });

    it('calls fetchDoc once auth finishes loading', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null });
      const { rerender } = renderHook(
        ({ isAuthLoading }) => useMarkdownState({ isAuthLoading }),
        { initialProps: { isAuthLoading: true } },
      );

      expect(fetchDoc).not.toHaveBeenCalled();

      rerender({ isAuthLoading: false });

      await waitFor(() => expect(fetchDoc).toHaveBeenCalledWith('abc1234'));
    });

    it('calls updateDoc debounced on text change', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkdownState());
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Updated'));
      expect(updateDoc).not.toHaveBeenCalled();

      await act(() => vi.runAllTimersAsync());
      expect(updateDoc).toHaveBeenCalledWith('abc1234', { content: '# Updated' });
      vi.useRealTimers();
    });

    it('calls updateDoc debounced on title change', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkdownState());
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setTitle('New Title'));
      expect(updateDoc).not.toHaveBeenCalled();

      await act(() => vi.runAllTimersAsync());
      expect(updateDoc).toHaveBeenCalledWith('abc1234', { title: 'New Title' });
      vi.useRealTimers();
    });

    it('sets error when updateDoc fails', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null });
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
