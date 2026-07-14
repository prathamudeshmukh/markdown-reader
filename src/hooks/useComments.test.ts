import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComments } from './useComments';
import type { RealtimeDocSyncResult } from '../realtime/useRealtimeDocSync';

vi.mock('../api/commentsApi', () => ({
  fetchComments: vi.fn(),
  postComment: vi.fn(),
  resolveComment: vi.fn(),
  deleteComment: vi.fn(),
}));

import { fetchComments, postComment, resolveComment, deleteComment } from '../api/commentsApi';

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

const mockComment = {
  id: 'c1',
  docSlug: 'doc123',
  userId: null,
  authorName: 'Anonymous',
  content: 'Hello',
  anchorText: 'selected text',
  resolved: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockComment2 = {
  ...mockComment,
  id: 'c2',
  resolved: true,
};

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty state when slug is null', () => {
    const { result } = renderHook(() => useComments(null, mockSync));
    expect(result.current.comments).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.unresolvedCount).toBe(0);
  });

  it('fetches comments on mount when slug is provided', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([mockComment]);

    const { result } = renderHook(() => useComments('doc123', mockSync));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(vi.mocked(fetchComments)).toHaveBeenCalledWith('doc123');
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].id).toBe('c1');
  });

  it('derives unresolvedCount correctly', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([mockComment, mockComment2]);

    const { result } = renderHook(() => useComments('doc123', mockSync));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.unresolvedCount).toBe(1);
  });

  it('applies optimistic update before addComment resolves', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([]);

    const slowPost = new Promise<typeof mockComment>((resolve) => {
      setTimeout(() => resolve(mockComment), 200);
    });
    vi.mocked(postComment).mockReturnValueOnce(slowPost);

    const { result } = renderHook(() => useComments('doc123', mockSync));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      void result.current.addComment({ content: 'Hello', authorName: '', anchorText: 'selected text' });
    });

    // Optimistic comment should be added before the slow promise resolves
    expect(result.current.comments.length).toBe(1);
    expect(result.current.comments[0].content).toBe('Hello');
  });

  it('rolls back optimistic update on addComment error', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([]);
    vi.mocked(postComment).mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useComments('doc123', mockSync));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addComment({ content: 'Hello', authorName: '', anchorText: null });
    });

    expect(result.current.comments).toHaveLength(0);
    expect(result.current.error).toBe('Server error');
  });

  it('applies optimistic update before toggleResolve resolves', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([mockComment]);

    const slowResolve = new Promise<typeof mockComment>((res) => {
      setTimeout(() => res({ ...mockComment, resolved: true }), 200);
    });
    vi.mocked(resolveComment).mockReturnValueOnce(slowResolve);

    const { result } = renderHook(() => useComments('doc123', mockSync));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      void result.current.toggleResolve('c1', true);
    });

    expect(result.current.comments[0].resolved).toBe(true);
  });

  it('rolls back toggleResolve on error', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([mockComment]);
    vi.mocked(resolveComment).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useComments('doc123', mockSync));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleResolve('c1', true);
    });

    expect(result.current.comments[0].resolved).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('applies optimistic delete before removeComment resolves', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([mockComment]);
    const slowDelete = new Promise<void>((res) => setTimeout(res, 200));
    vi.mocked(deleteComment).mockReturnValueOnce(slowDelete);

    const { result } = renderHook(() => useComments('doc123', mockSync));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      void result.current.removeComment('c1', 'jwt');
    });

    expect(result.current.comments).toHaveLength(0);
  });

  it('rolls back optimistic delete on error', async () => {
    vi.mocked(fetchComments).mockResolvedValueOnce([mockComment]);
    vi.mocked(deleteComment).mockRejectedValueOnce(new Error('Forbidden'));

    const { result } = renderHook(() => useComments('doc123', mockSync));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.removeComment('c1', 'jwt');
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.error).toBe('Forbidden');
  });

  it('sets error when fetchComments fails', async () => {
    vi.mocked(fetchComments).mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => useComments('doc123', mockSync));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.comments).toHaveLength(0);
  });
});
