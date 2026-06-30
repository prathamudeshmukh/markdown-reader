import { useState, useEffect, useCallback } from 'react';
import { fetchApiKeys, createApiKey, revokeApiKey, type ApiKey } from '../api/apiKeysApi';

export interface UseApiKeysResult {
  keys: ApiKey[];
  isLoading: boolean;
  error: string | null;
  createKey: (label: string) => Promise<{ key: string }>;
  revokeKey: (id: string) => Promise<void>;
}

export function useApiKeys(): UseApiKeysResult {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await fetchApiKeys();
      setKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const createKey = useCallback(async (label: string): Promise<{ key: string }> => {
    try {
      const { key, rawKey } = await createApiKey(label);
      setKeys((prev) => [...prev, key]);
      return { key: rawKey };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      setError(message);
      throw err;
    }
  }, []);

  const revokeKey = useCallback(async (id: string): Promise<void> => {
    const previous = keys;
    setKeys((prev) => prev.filter((k) => k.id !== id));
    try {
      await revokeApiKey(id);
    } catch (err) {
      setKeys(previous);
      const message = err instanceof Error ? err.message : 'Failed to revoke API key';
      setError(message);
      throw err;
    }
  }, [keys]);

  return { keys, isLoading, error, createKey, revokeKey };
}
