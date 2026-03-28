import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/docsApi', () => ({
  fetchUserDocs: vi.fn(),
}));

vi.mock('../utils/recentDocs', () => ({
  readRecentDocs: vi.fn(),
}));

import { useRecentDocs } from './useRecentDocs';
import { useAuth } from '../auth/AuthContext';
import { fetchUserDocs } from '../api/docsApi';
import { readRecentDocs } from '../utils/recentDocs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRecentDocs', () => {
  it('reads from localStorage when user is not signed in', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
    vi.mocked(readRecentDocs).mockReturnValue([
      { slug: 'abc1234', title: 'My Doc', savedAt: '2026-03-12T15:40:00.000Z' },
    ]);

    const { result } = renderHook(() => useRecentDocs());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.status).toBe('ready');
    if (result.current.status === 'ready') {
      expect(result.current.docs).toEqual([
        { slug: 'abc1234', title: 'My Doc', savedAt: '2026-03-12T15:40:00.000Z', collectionId: null },
      ]);
    }
    expect(fetchUserDocs).not.toHaveBeenCalled();
  });

  it('maps localStorage docs without title to title: null', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
    vi.mocked(readRecentDocs).mockReturnValue([
      { slug: 'xyz9999', savedAt: '2026-03-11T09:12:00.000Z' },
    ]);

    const { result } = renderHook(() => useRecentDocs());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.docs[0].title).toBeNull();
    }
  });

  it('fetches from API when user is signed in', async () => {
    const user = { id: 'user-uuid', email: 'test@example.com' } as never;
    vi.mocked(useAuth).mockReturnValue({ user, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
    vi.mocked(fetchUserDocs).mockResolvedValueOnce([
      { slug: 'abc1234', title: 'Server Doc', updatedAt: '2026-03-12T15:40:00.000Z', collectionId: null },
    ]);

    const { result } = renderHook(() => useRecentDocs());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.docs).toEqual([
        { slug: 'abc1234', title: 'Server Doc', savedAt: '2026-03-12T15:40:00.000Z', collectionId: null },
      ]);
    }
    expect(readRecentDocs).not.toHaveBeenCalled();
  });

  it('sets error status when API call fails', async () => {
    const user = { id: 'user-uuid', email: 'test@example.com' } as never;
    vi.mocked(useAuth).mockReturnValue({ user, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
    vi.mocked(fetchUserDocs).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRecentDocs());

    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') {
      expect(result.current.message).toBe('Network error');
    }
  });
});
