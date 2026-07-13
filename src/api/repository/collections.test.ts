import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollections, createCollection, updateCollection, deleteCollection } from './collections';
import { RepositoryError } from './shared';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

const row = {
  id: 'col-1',
  user_id: 'user-1',
  parent_id: 'col-parent',
  name: 'Travel',
  position: 0,
  created_at: '2026-03-12T15:40:00.000Z',
  updated_at: '2026-03-12T15:40:00.000Z',
};

const camelCollection = {
  id: 'col-1',
  userId: 'user-1',
  parentId: 'col-parent',
  name: 'Travel',
  position: 0,
  createdAt: '2026-03-12T15:40:00.000Z',
  updatedAt: '2026-03-12T15:40:00.000Z',
};

describe('collections repository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('getCollections', () => {
    // Regression test: the previous unmapped CollectionRow[] sent parent_id over
    // the wire, but collectionTree.ts reads col.parentId — every collection's
    // parent was silently undefined, flattening the sidebar tree.
    it('maps parent_id to parentId so parent-child relationships survive the wire', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      const result = await getCollections(env, 'user-1', 'user-jwt');

      expect(result).toEqual([camelCollection]);
      expect(result[0].parentId).toBe('col-parent');
    });

    it('filters by user_id in the query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getCollections(env, 'user-1', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('user_id=eq.user-1'), expect.any(Object));
    });

    it('sends the caller JWT as the Bearer token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getCollections(env, 'user-1', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }) }),
      );
    });
  });

  describe('createCollection', () => {
    it('posts and maps the returned row to a Collection', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 201 }));

      const result = await createCollection(env, { name: 'Travel', parentId: 'col-parent', userId: 'user-1', userJwt: 'user-jwt' });

      expect(result).toEqual(camelCollection);
    });

    it('omits parent_id from the body when not provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ ...row, parent_id: null }]), { status: 201 }));

      await createCollection(env, { name: 'Travel', userId: 'user-1', userJwt: 'user-jwt' });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.parent_id).toBeUndefined();
    });
  });

  describe('updateCollection', () => {
    it('patches the correct URL and maps the result', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ ...row, name: 'Renamed' }]), { status: 200 }));

      const result = await updateCollection(env, 'col-1', { name: 'Renamed', userJwt: 'user-jwt' });

      expect(result).toEqual({ ...camelCollection, name: 'Renamed' });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('id=eq.col-1'), expect.objectContaining({ method: 'PATCH' }));
    });
  });

  describe('deleteCollection', () => {
    it('issues DELETE with the caller JWT', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteCollection(env, 'col-1', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('id=eq.col-1'),
        expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }) }),
      );
    });

    it('throws a RepositoryError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

      await expect(deleteCollection(env, 'col-1', 'user-jwt')).rejects.toBeInstanceOf(RepositoryError);
    });
  });
});
