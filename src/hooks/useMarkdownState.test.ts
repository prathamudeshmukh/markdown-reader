import { useState } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/route', () => ({ getSlugFromPath: vi.fn() }));
vi.mock('../api/docsApi', () => ({
  fetchDoc: vi.fn(),
  saveDoc: vi.fn(),
  updateDoc: vi.fn(),
}));
vi.mock('../utils/creatorTokens', () => ({
  saveCreatorToken: vi.fn(),
  loadCreatorToken: vi.fn(() => null),
  clearCreatorToken: vi.fn(),
}));
vi.mock('../utils/recentDocs', () => ({ addRecentDoc: vi.fn() }));
vi.mock('../telemetry', () => ({
  track: vi.fn(),
  getContentLengthBucket: vi.fn(() => 'xs'),
  getErrorType: vi.fn(() => 'unknown'),
}));
vi.mock('../utils/onboarding', () => ({
  getInitialMarkdownText: vi.fn(() => ''),
  SAMPLE_DOC: '# Sample',
}));

import { useMarkdownState } from './useMarkdownState';
import type { RealtimeDocSyncResult } from '../realtime/useRealtimeDocSync';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';
import { addRecentDoc } from '../utils/recentDocs';
import { track } from '../telemetry';
import { getInitialMarkdownText, SAMPLE_DOC } from '../utils/onboarding';
import { saveCreatorToken, loadCreatorToken, clearCreatorToken } from '../utils/creatorTokens';

const mockSync: RealtimeDocSyncResult = {
  broadcastContent: vi.fn(),
  broadcastCommentAdded: vi.fn(),
  broadcastCommentUpdated: vi.fn(),
  broadcastCommentDeleted: vi.fn(),
  subscribeContent: vi.fn(() => () => undefined),
  subscribeCommentAdded: vi.fn(() => () => undefined),
  subscribeCommentUpdated: vi.fn(() => () => undefined),
  subscribeCommentDeleted: vi.fn(() => () => undefined),
  presenceCount: 0,
};

// Mirrors how App.tsx owns slug and threads it into useMarkdownState — the
// hook itself no longer owns slug as internal state.
function renderMarkdownState(options: { userId?: string } = {}) {
  return renderHook(() => {
    const [slug, setSlug] = useState<string | null>(() => getSlugFromPath());
    const markdownState = useMarkdownState({ slug, setSlug, sync: mockSync, ...options });
    return { slug, ...markdownState };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  Object.defineProperty(window, 'location', {
    value: { pathname: '/' },
    writable: true,
  });
});

describe('useMarkdownState', () => {
  describe('root page (no slug)', () => {
    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue(null);
    });

    it('starts with empty text, not loading, no error', () => {
      const { result } = renderMarkdownState();
      expect(result.current.markdownText).toBe('');
      expect(result.current.title).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.slug).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('loads sample doc on first new-doc visit when getInitialMarkdownText returns it', () => {
      vi.mocked(getInitialMarkdownText).mockReturnValueOnce(SAMPLE_DOC);
      const { result } = renderMarkdownState();
      expect(result.current.markdownText).toBe(SAMPLE_DOC);
    });

    it('does not call fetchDoc on mount', () => {
      renderMarkdownState();
      expect(fetchDoc).not.toHaveBeenCalled();
    });

    it('updates markdownText without calling updateDoc', () => {
      vi.useFakeTimers();
      const { result } = renderMarkdownState();

      act(() => result.current.setMarkdownText('# Hello'));
      act(() => vi.runAllTimers());

      expect(result.current.markdownText).toBe('# Hello');
      expect(updateDoc).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('onSave does nothing when text is empty', async () => {
      const { result } = renderMarkdownState();
      await act(() => result.current.onSave());
      expect(saveDoc).not.toHaveBeenCalled();
    });

    it('onSave stores creator token after successful save', async () => {
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234', creatorToken: 'tok-abc' });
      const { result } = renderMarkdownState();

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(saveCreatorToken).toHaveBeenCalledWith('new1234', 'tok-abc');
    });

    it('onSave calls saveDoc, updates URL and slug in-place on success', async () => {
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234', creatorToken: 'tok-abc' });
      const { result } = renderMarkdownState();

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(saveDoc).toHaveBeenCalledWith({ content: '# Hello', title: undefined, collectionId: null });
      expect(addRecentDoc).toHaveBeenCalledWith('new1234', null);
      expect(track).toHaveBeenCalledWith(
        'doc_save_clicked',
        expect.objectContaining({ source: 'button' }),
      );
      expect(track).toHaveBeenCalledWith('doc_save_succeeded', { slug_created: true });
      expect(history.pushState).toHaveBeenCalledWith({}, '', '/d/new1234');
      expect(result.current.slug).toBe('new1234');
      expect(result.current.mode).toBe('editor');
      expect(result.current.isSaving).toBe(false);
    });

    it('onSave includes title when set', async () => {
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234', creatorToken: 'tok-abc' });
      const { result } = renderMarkdownState();

      act(() => result.current.setMarkdownText('# Hello'));
      act(() => result.current.setTitle('My Doc'));
      await act(() => result.current.onSave());

      expect(saveDoc).toHaveBeenCalledWith({ content: '# Hello', title: 'My Doc', collectionId: null });
      expect(addRecentDoc).toHaveBeenCalledWith('new1234', 'My Doc');
    });

    it('onSave sets error on failure', async () => {
      vi.mocked(saveDoc).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderMarkdownState();

      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());

      expect(result.current.error).toBe('Network error');
      expect(track).toHaveBeenCalledWith(
        'doc_save_failed',
        expect.objectContaining({ error_type: expect.any(String) }),
      );
      expect(result.current.isSaving).toBe(false);
    });

    it('toggleMode cycles editor → preview → editor', () => {
      const { result } = renderMarkdownState();
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
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      const { result } = renderMarkdownState();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.slug).toBe('abc1234');
    });

    it('fetches doc and populates markdownText and title', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: 'My Doc', user_id: null, edit_access: false });
      const { result } = renderMarkdownState();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.markdownText).toBe('# Hello');
      expect(result.current.title).toBe('My Doc');
      expect(fetchDoc).toHaveBeenCalledWith('abc1234');
      expect(addRecentDoc).toHaveBeenCalledWith('abc1234', 'My Doc');
    });

    it('sets error when fetch fails', async () => {
      vi.mocked(fetchDoc).mockRejectedValueOnce(new Error('Not found'));
      const { result } = renderMarkdownState();

      await waitFor(() => expect(result.current.error).toBe('Not found'));
      expect(result.current.isLoading).toBe(false);
    });

    it('calls fetchDoc immediately on mount without waiting for any auth state', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      renderMarkdownState();
      // fetchDoc must fire on the first render tick, before any auth resolves
      await waitFor(() => expect(fetchDoc).toHaveBeenCalledWith('abc1234'));
    });

    it('calls updateDoc debounced on text change', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState();
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Updated'));
      expect(updateDoc).not.toHaveBeenCalled();

      await act(() => vi.runAllTimersAsync());
      expect(updateDoc).toHaveBeenCalledWith('abc1234', { content: '# Updated' });
      vi.useRealTimers();
    });

    it('calls updateDoc debounced on title change', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState();
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setTitle('New Title'));
      expect(updateDoc).not.toHaveBeenCalled();

      await act(() => vi.runAllTimersAsync());
      expect(updateDoc).toHaveBeenCalledWith('abc1234', { title: 'New Title' });
      vi.useRealTimers();
    });

    it('sets error when updateDoc fails', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderMarkdownState();
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Updated'));
      await act(() => vi.runAllTimersAsync());

      expect(result.current.error).toBe('Save failed');
      vi.useRealTimers();
    });

    describe('ownership claim via auto-save', () => {
      it('sends claim payload and clears token when user has creator token for unowned doc', async () => {
        vi.useFakeTimers();
        vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
        vi.mocked(loadCreatorToken).mockReturnValue('my-token');
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        const { result } = renderMarkdownState({ userId: 'user-uuid' });
        await act(() => vi.runAllTimersAsync());

        act(() => result.current.setMarkdownText('# Updated'));
        await act(() => vi.runAllTimersAsync());

        expect(updateDoc).toHaveBeenCalledWith('abc1234', expect.objectContaining({
          content: '# Updated',
          claim: true,
          creatorToken: 'my-token',
        }));
        expect(clearCreatorToken).toHaveBeenCalledWith('abc1234');
        expect(result.current.docUserId).toBe('user-uuid');
        vi.useRealTimers();
      });

      it('does not send claim payload when doc is already owned', async () => {
        vi.useFakeTimers();
        vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'user-uuid', edit_access: false });
        vi.mocked(loadCreatorToken).mockReturnValue('my-token');
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        const { result } = renderMarkdownState({ userId: 'user-uuid' });
        await act(() => vi.runAllTimersAsync());

        act(() => result.current.setMarkdownText('# Updated'));
        await act(() => vi.runAllTimersAsync());

        expect(updateDoc).toHaveBeenCalledWith('abc1234', expect.objectContaining({ content: '# Updated' }));
        expect(updateDoc).not.toHaveBeenCalledWith('abc1234', expect.objectContaining({ claim: true }));
        vi.useRealTimers();
      });

      it('does not send claim payload when user is not authenticated', async () => {
        vi.useFakeTimers();
        vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
        vi.mocked(loadCreatorToken).mockReturnValue('my-token');
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        const { result } = renderMarkdownState();
        await act(() => vi.runAllTimersAsync());

        act(() => result.current.setMarkdownText('# Updated'));
        await act(() => vi.runAllTimersAsync());

        expect(updateDoc).toHaveBeenCalledWith('abc1234', expect.objectContaining({ content: '# Updated' }));
        expect(updateDoc).not.toHaveBeenCalledWith('abc1234', expect.objectContaining({ claim: true }));
        vi.useRealTimers();
      });

      it('does not send claim payload when no creator token in storage', async () => {
        vi.useFakeTimers();
        vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
        vi.mocked(loadCreatorToken).mockReturnValue(null);
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        const { result } = renderMarkdownState({ userId: 'user-uuid' });
        await act(() => vi.runAllTimersAsync());

        act(() => result.current.setMarkdownText('# Updated'));
        await act(() => vi.runAllTimersAsync());

        expect(updateDoc).toHaveBeenCalledWith('abc1234', expect.objectContaining({ content: '# Updated' }));
        expect(updateDoc).not.toHaveBeenCalledWith('abc1234', expect.objectContaining({ claim: true }));
        vi.useRealTimers();
      });
    });
  });

  describe('editAccess and canEdit', () => {
    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue('abc1234');
    });

    it('stores edit_access from fetched doc', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: true });
      const { result } = renderMarkdownState();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.editAccess).toBe(true);
    });

    it('canEdit is true for owner regardless of edit_access', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: false });
      const { result } = renderMarkdownState({ userId: 'owner-id' });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canEdit).toBe(true);
    });

    it('canEdit is true for non-owner when edit_access is true', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: true });
      const { result } = renderMarkdownState({ userId: 'visitor-id' });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canEdit).toBe(true);
    });

    it('canEdit is false for non-owner when edit_access is false', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: false });
      const { result } = renderMarkdownState({ userId: 'visitor-id' });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canEdit).toBe(false);
    });

    it('isOwner is true when userId matches docUserId', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: false });
      const { result } = renderMarkdownState({ userId: 'owner-id' });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isOwner).toBe(true);
    });

    it('setMarkdownText skips updateDoc when canEdit is false (owned doc, no edit_access, non-owner)', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: false });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState({ userId: 'visitor-id' });
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Changed'));
      await act(() => vi.runAllTimersAsync());

      expect(updateDoc).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('setMarkdownText calls updateDoc when canEdit is true (edit_access on)', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: true });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState({ userId: 'visitor-id' });
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Changed'));
      await act(() => vi.runAllTimersAsync());

      expect(updateDoc).toHaveBeenCalledWith('abc1234', expect.objectContaining({ content: '# Changed' }));
      vi.useRealTimers();
    });

    it('setEditAccess calls updateDoc with editAccess and updates state on success', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: false });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState({ userId: 'owner-id' });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(() => result.current.setEditAccess(true));

      expect(updateDoc).toHaveBeenCalledWith('abc1234', { editAccess: true });
      expect(result.current.editAccess).toBe(true);
    });

    it('setEditAccess sets error on failure', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, user_id: 'owner-id', edit_access: false });
      vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Forbidden'));

      const { result } = renderMarkdownState({ userId: 'owner-id' });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(() => result.current.setEditAccess(true));

      expect(result.current.error).toBe('Forbidden');
      expect(result.current.editAccess).toBe(false);
    });
  });

  describe('navigateToDoc', () => {
    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue('abc1234');
    });

    it('updates URL, sets new slug, and resets state to loading', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Old', title: null, user_id: null, edit_access: false });
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'xyz5678', content: '# New', title: null, user_id: null, edit_access: false });
      const { result } = renderMarkdownState();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.navigateToDoc('xyz5678'));

      expect(history.pushState).toHaveBeenCalledWith({}, '', '/d/xyz5678');
      expect(result.current.slug).toBe('xyz5678');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.markdownText).toBe('');
      expect(result.current.title).toBeNull();
    });

    it('fetches and loads the new doc content after navigation', async () => {
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Old', title: null, user_id: null, edit_access: false });
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'xyz5678', content: '# New', title: 'New Doc', user_id: null, edit_access: false });
      const { result } = renderMarkdownState();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.navigateToDoc('xyz5678'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fetchDoc).toHaveBeenCalledWith('xyz5678');
      expect(result.current.markdownText).toBe('# New');
      expect(result.current.title).toBe('New Doc');
    });

    it('cancels pending text debounce so updateDoc is not called for the old slug', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValue({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState();
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setMarkdownText('# Unsaved edit'));
      act(() => result.current.navigateToDoc('xyz5678'));
      await act(() => vi.runAllTimersAsync());

      expect(updateDoc).not.toHaveBeenCalledWith('abc1234', expect.anything());
      vi.useRealTimers();
    });

    it('cancels pending title debounce so updateDoc is not called for the old slug', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDoc).mockResolvedValue({ slug: 'abc1234', content: '# Hello', title: null, user_id: null, edit_access: false });
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const { result } = renderMarkdownState();
      await act(() => vi.runAllTimersAsync());

      act(() => result.current.setTitle('Unsaved title'));
      act(() => result.current.navigateToDoc('xyz5678'));
      await act(() => vi.runAllTimersAsync());

      expect(updateDoc).not.toHaveBeenCalledWith('abc1234', expect.anything());
      vi.useRealTimers();
    });

    it('clears savedLocallyRef so fetchDoc fires for the new slug after a prior save', async () => {
      vi.mocked(getSlugFromPath).mockReturnValue(null);
      vi.mocked(saveDoc).mockResolvedValueOnce({ slug: 'new1234', creatorToken: 'tok-abc' });
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'xyz5678', content: '# Other', title: null, user_id: null, edit_access: false });

      const { result } = renderMarkdownState();
      act(() => result.current.setMarkdownText('# Hello'));
      await act(() => result.current.onSave());
      expect(result.current.slug).toBe('new1234');

      act(() => result.current.navigateToDoc('xyz5678'));

      await waitFor(() => expect(fetchDoc).toHaveBeenCalledWith('xyz5678'));
    });
  });

  describe('openMdFile', () => {
    function makeFile(name: string, content: string): File {
      const file = new File([content], name, { type: 'text/markdown' });
      Object.defineProperty(file, 'text', { value: () => Promise.resolve(content) });
      return file;
    }

    beforeEach(() => {
      vi.mocked(getSlugFromPath).mockReturnValue(null);
    });

    it('loads content directly when current doc is empty', async () => {
      const file = makeFile('notes.md', '# Title\n\nBody');
      const { result } = renderMarkdownState();

      await act(() => result.current.openMdFile(file, 'toolbar'));

      expect(result.current.markdownText).toBe('# Title\n\nBody');
      expect(result.current.mode).toBe('preview');
      expect(result.current.slug).toBeNull();
      expect(result.current.openMdFileGuardOpen).toBe(false);
    });

    it('loads content directly when current doc already has a slug', async () => {
      vi.mocked(getSlugFromPath).mockReturnValue('abc1234');
      vi.mocked(fetchDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Old', title: null, user_id: null, edit_access: false });
      const file = makeFile('new.md', '# New content');
      const { result } = renderMarkdownState();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(() => result.current.openMdFile(file, 'toolbar'));

      expect(result.current.markdownText).toBe('# New content');
      expect(result.current.slug).toBeNull();
      expect(result.current.openMdFileGuardOpen).toBe(false);
    });

    it('shows guard when current doc is unsaved and non-empty', async () => {
      const { result } = renderMarkdownState();
      act(() => result.current.setMarkdownText('Existing content'));

      const file = makeFile('new.md', '# New');
      await act(() => result.current.openMdFile(file, 'toolbar'));

      expect(result.current.openMdFileGuardOpen).toBe(true);
      expect(result.current.markdownText).toBe('Existing content');
    });

    it('discard path: replaces content and clears slug', async () => {
      const { result } = renderMarkdownState();
      act(() => result.current.setMarkdownText('Existing content'));

      const file = makeFile('new.md', '# New content');
      await act(() => result.current.openMdFile(file, 'toolbar'));
      expect(result.current.openMdFileGuardOpen).toBe(true);

      await act(() => result.current.confirmOpenMdFile('discard'));

      expect(result.current.markdownText).toBe('# New content');
      expect(result.current.mode).toBe('preview');
      expect(result.current.slug).toBeNull();
      expect(result.current.openMdFileGuardOpen).toBe(false);
    });

    it('cancel path: state unchanged, guard closed', async () => {
      const { result } = renderMarkdownState();
      act(() => result.current.setMarkdownText('Existing content'));

      const file = makeFile('new.md', '# New');
      await act(() => result.current.openMdFile(file, 'toolbar'));

      await act(() => result.current.confirmOpenMdFile('cancel'));

      expect(result.current.markdownText).toBe('Existing content');
      expect(result.current.openMdFileGuardOpen).toBe(false);
    });

    it('sets error and does not change content when file is too large', async () => {
      const file = makeFile('big.md', 'x');
      Object.defineProperty(file, 'size', { value: 2_000_000 });

      const { result } = renderMarkdownState();

      await act(() => result.current.openMdFile(file, 'toolbar'));

      expect(result.current.error).toMatch(/too large/i);
      expect(result.current.markdownText).toBe('');
    });
  });
});
