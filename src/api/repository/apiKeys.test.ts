import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupApiKey, touchApiKeyLastUsed, insertApiKey, listApiKeys, deleteApiKey } from './apiKeys';
import { RepositoryError } from './shared';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

describe('apiKeys repository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('lookupApiKey', () => {
    it('returns a camelCase ApiKeyRow when found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'key-1', user_id: 'user-1' }]), { status: 200 }));

      const result = await lookupApiKey(env, 'hash123');

      expect(result).toEqual({ id: 'key-1', userId: 'user-1' });
    });

    it('returns null when no key matches', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      const result = await lookupApiKey(env, 'missing');

      expect(result).toBeNull();
    });

    it('uses the service-role key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await lookupApiKey(env, 'hash123');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) }),
      );
    });
  });

  describe('touchApiKeyLastUsed', () => {
    it('patches last_used_at with the service-role key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await touchApiKeyLastUsed(env, 'key-1');

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[0]).toContain('id=eq.key-1');
      const body = JSON.parse(call[1]?.body as string);
      expect(body.last_used_at).toEqual(expect.any(String));
    });
  });

  describe('insertApiKey', () => {
    it('posts and maps the returned row to a camelCase ApiKeyRecord', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 'key-1', label: 'My Key', created_at: '2026-03-12T15:40:00.000Z', last_used_at: null }]), {
          status: 201,
        }),
      );

      const result = await insertApiKey(env, { userId: 'user-1', keyHash: 'hash123', label: 'My Key' }, 'user-jwt');

      expect(result).toEqual({ id: 'key-1', label: 'My Key', createdAt: '2026-03-12T15:40:00.000Z', lastUsedAt: null });
    });
  });

  describe('listApiKeys', () => {
    it('returns records mapped to camelCase', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 'key-1', label: 'My Key', created_at: '2026-03-12T15:40:00.000Z', last_used_at: null }]), {
          status: 200,
        }),
      );

      const result = await listApiKeys(env, 'user-1', 'user-jwt');

      expect(result).toEqual([{ id: 'key-1', label: 'My Key', createdAt: '2026-03-12T15:40:00.000Z', lastUsedAt: null }]);
    });
  });

  describe('deleteApiKey', () => {
    it('filters by both id and user_id in the query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteApiKey(env, 'key-1', 'user-1', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/id=eq\.key-1.*user_id=eq\.user-1/),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws a RepositoryError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

      await expect(deleteApiKey(env, 'key-1', 'user-1', 'user-jwt')).rejects.toBeInstanceOf(RepositoryError);
    });
  });
});
