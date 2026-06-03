import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/collectionsApi', () => ({
  fetchCollections: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));

vi.mock('../api/docsApi', () => ({
  fetchUserDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => {
  const mockAuth = { user: { id: 'user-1' } };
  return { useAuth: vi.fn(() => mockAuth) };
});

import { useCollections } from './useCollections';
import { fetchCollections } from '../api/collectionsApi';
import { fetchUserDocs, deleteDoc as apiDeleteDoc } from '../api/docsApi';

const fakeCollection = {
  id: 'col-1',
  userId: 'user-1',
  parentId: null,
  name: 'Work',
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const fakeDoc = {
  slug: 'abc1234',
  title: 'My Doc',
  updatedAt: '2026-01-01T00:00:00.000Z',
  collectionId: 'col-1',
};

const fakeDoc2 = {
  slug: 'xyz9999',
  title: 'Another Doc',
  updatedAt: '2026-01-01T00:00:00.000Z',
  collectionId: null,
};

function slugsFromState(state: ReturnType<typeof useCollections>['state']): string[] {
  if (state.status !== 'ready') return [];
  return [
    ...state.tree.rootDocs.map((d) => d.slug),
    ...state.tree.rootCollections.flatMap((c) => c.docs.map((d) => d.slug)),
  ];
}

function setupMocks() {
  vi.mocked(fetchCollections).mockResolvedValue([fakeCollection]);
  vi.mocked(fetchUserDocs).mockResolvedValue([fakeDoc, fakeDoc2]);
}

describe('useCollections.deleteDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('removes the doc from the tree optimistically before the API resolves', async () => {
    vi.mocked(apiDeleteDoc).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCollections());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    await act(async () => {
      await result.current.deleteDoc('abc1234');
    });

    expect(slugsFromState(result.current.state)).not.toContain('abc1234');
    expect(slugsFromState(result.current.state)).toContain('xyz9999');
  });

  it('leaves the tree updated after the API succeeds', async () => {
    vi.mocked(apiDeleteDoc).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCollections());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    await act(async () => {
      await result.current.deleteDoc('abc1234');
    });

    expect(result.current.state.status).toBe('ready');
    expect(slugsFromState(result.current.state)).not.toContain('abc1234');
    expect(slugsFromState(result.current.state)).toContain('xyz9999');
  });

  it('rolls back to the previous state when the API throws', async () => {
    vi.mocked(apiDeleteDoc).mockRejectedValueOnce(new Error('Forbidden'));

    const { result } = renderHook(() => useCollections());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    await act(async () => {
      await expect(result.current.deleteDoc('abc1234')).rejects.toThrow('Forbidden');
    });

    expect(result.current.state.status).toBe('ready');
    expect(slugsFromState(result.current.state)).toContain('abc1234');
  });
});
