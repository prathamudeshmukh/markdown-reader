import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiKeys } from './useApiKeys';

vi.mock('../api/apiKeysApi', () => ({
  fetchApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

import { fetchApiKeys, createApiKey, revokeApiKey } from '../api/apiKeysApi';

const mockKey = {
  id: 'key-1',
  label: 'CI bot',
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: null,
};

describe('useApiKeys', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches keys on mount', async () => {
    vi.mocked(fetchApiKeys).mockResolvedValueOnce([mockKey]);

    const { result } = renderHook(() => useApiKeys());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.keys).toEqual([mockKey]);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    vi.mocked(fetchApiKeys).mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useApiKeys());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('network error');
    expect(result.current.keys).toEqual([]);
  });

  describe('createKey', () => {
    it('returns the raw key string on success', async () => {
      vi.mocked(fetchApiKeys).mockResolvedValueOnce([]);
      vi.mocked(createApiKey).mockResolvedValueOnce({ key: { ...mockKey, id: 'key-2' }, rawKey: 'omk_newraw' });

      const { result } = renderHook(() => useApiKeys());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let rawKey: string | undefined;
      await act(async () => {
        const res = await result.current.createKey('New key');
        rawKey = res.key;
      });

      expect(rawKey).toBe('omk_newraw');
    });

    it('adds the new key to the list optimistically', async () => {
      vi.mocked(fetchApiKeys).mockResolvedValueOnce([mockKey]);
      vi.mocked(createApiKey).mockResolvedValueOnce({ key: { id: 'key-2', label: 'New', createdAt: '2026-02-01T00:00:00Z', lastUsedAt: null }, rawKey: 'omk_test' });

      const { result } = renderHook(() => useApiKeys());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createKey('New');
      });

      expect(result.current.keys.some((k) => k.id === 'key-2')).toBe(true);
    });

    it('sets error when create fails', async () => {
      vi.mocked(fetchApiKeys).mockResolvedValueOnce([mockKey]);
      vi.mocked(createApiKey).mockRejectedValueOnce(new Error('server error'));

      const { result } = renderHook(() => useApiKeys());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await expect(result.current.createKey('Bad label')).rejects.toThrow('server error');
      });

      expect(result.current.error).toBe('server error');
    });
  });

  describe('revokeKey', () => {
    it('removes the key from the list after revocation', async () => {
      vi.mocked(fetchApiKeys).mockResolvedValueOnce([mockKey]);
      vi.mocked(revokeApiKey).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useApiKeys());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.revokeKey('key-1');
      });

      expect(result.current.keys).toEqual([]);
    });

    it('rolls back list on error and sets error state', async () => {
      vi.mocked(fetchApiKeys).mockResolvedValueOnce([mockKey]);
      vi.mocked(revokeApiKey).mockRejectedValueOnce(new Error('delete failed'));

      const { result } = renderHook(() => useApiKeys());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await expect(result.current.revokeKey('key-1')).rejects.toThrow('delete failed');
      });

      expect(result.current.keys).toEqual([mockKey]);
      expect(result.current.error).toBe('delete failed');
    });
  });
});
