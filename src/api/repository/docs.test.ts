import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDoc, getDoc, updateDoc, getUserDocs, deleteDoc } from './docs';
import { RepositoryError } from './shared';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-header.test-payload.test-sig',
};

function fakeJwt(sub: string): string {
  return `header.${btoa(JSON.stringify({ sub }))}.sig`;
}

describe('docs repository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('createDoc', () => {
    it('posts to the correct URL and maps the row to a camelCase Doc', async () => {
      const row = { slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 201 }));

      const result = await createDoc(env, 'abc1234', { content: '# Hello' });

      expect(result).toEqual({ slug: 'abc1234', content: '# Hello', title: null, userId: null, collectionId: null, creatorToken: null, editAccess: false });
      expect(fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/docs',
        expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ apikey: 'test-anon-key' }) }),
      );
    });

    it('includes user_id in the request body when userJwt is provided', async () => {
      const jwt = fakeJwt('user-uuid');
      const row = { slug: 'abc1234', content: '# Hello', title: null, user_id: 'user-uuid', collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 201 }));

      await createDoc(env, 'abc1234', { content: '# Hello', userJwt: jwt });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.user_id).toBe('user-uuid');
    });

    it('uses the service-role key when userJwt is synthetic', async () => {
      const syntheticJwt = `synthetic.${btoa(JSON.stringify({ sub: 'user-uuid' }))}.internal`;
      const row = { slug: 'abc1234', content: '# Hello', title: null, user_id: 'user-uuid', collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 201 }));

      await createDoc(env, 'abc1234', { content: '# Hello', userJwt: syntheticJwt });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) }),
      );
    });

    it('throws a RepositoryError with kind conflict on a duplicate slug', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint' }), { status: 409 }),
      );

      const error = await createDoc(env, 'abc1234', { content: '# Hello' }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(RepositoryError);
      expect((error as RepositoryError).kind).toBe('conflict');
    });
  });

  describe('getDoc', () => {
    it('returns a camelCase Doc when found', async () => {
      const row = { slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      const result = await getDoc(env, 'abc1234');

      expect(result).toEqual({ slug: 'abc1234', content: '# Hello', title: null, userId: null, collectionId: null, creatorToken: null, editAccess: false });
    });

    it('returns null when the array is empty', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      const result = await getDoc(env, 'missing');

      expect(result).toBeNull();
    });

    it('encodes the slug in the query string', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getDoc(env, 'abc1234');

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('slug=eq.abc1234'), expect.any(Object));
    });

    it('uses the service-role key to bypass RLS', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getDoc(env, 'abc1234');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) }),
      );
    });

    it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      await expect(getDoc({ ...env, SUPABASE_SERVICE_ROLE_KEY: '' }, 'abc1234')).rejects.toThrow('SUPABASE_SERVICE_ROLE_KEY');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('throws a RepositoryError with kind network on a 500', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }));

      const error = await getDoc(env, 'abc').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(RepositoryError);
      expect((error as RepositoryError).kind).toBe('network');
    });
  });

  describe('updateDoc', () => {
    it('patches the correct URL and maps the result to a camelCase Doc', async () => {
      const row = { slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      const result = await updateDoc(env, 'abc1234', { content: '# Updated' });

      expect(result).toEqual({ slug: 'abc1234', content: '# Updated', title: null, userId: null, collectionId: null, creatorToken: null, editAccess: false });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('slug=eq.abc1234'), expect.objectContaining({ method: 'PATCH' }));
    });

    it('sends edit_access in the body when editAccess is provided', async () => {
      const row = { slug: 'abc1234', content: '# Hello', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: true };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      await updateDoc(env, 'abc1234', { editAccess: true });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.edit_access).toBe(true);
    });

    it('omits edit_access from the body when not provided', async () => {
      const row = { slug: 'abc1234', content: '# Updated', title: null, user_id: null, collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      await updateDoc(env, 'abc1234', { content: '# Updated' });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.edit_access).toBeUndefined();
    });

    it('clears creator_token when clearCreatorToken is set', async () => {
      const row = { slug: 'abc1234', content: '# Hello', title: null, user_id: 'uid', collection_id: null, creator_token: null, edit_access: false };
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));

      await updateDoc(env, 'abc1234', { userJwt: fakeJwt('uid'), userId: 'uid', clearCreatorToken: true });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.creator_token).toBeNull();
    });
  });

  describe('getUserDocs', () => {
    it('returns a mapped DocSummary array', async () => {
      const rows = [{ slug: 'abc1234', title: 'My Doc', updated_at: '2026-03-12T15:40:00.000Z', collection_id: null }];
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(rows), { status: 200 }));

      const result = await getUserDocs(env, 'user-uuid', 'user-jwt');

      expect(result).toEqual([{ slug: 'abc1234', title: 'My Doc', updatedAt: '2026-03-12T15:40:00.000Z', collectionId: null }]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('user_id=eq.user-uuid'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }) }),
      );
    });
  });

  describe('deleteDoc', () => {
    it('issues DELETE with the slug encoded in the query string', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteDoc(env, 'abc1234', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('slug=eq.abc1234'), expect.objectContaining({ method: 'DELETE' }));
    });

    it('sends the real user JWT as the Bearer token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteDoc(env, 'abc1234', 'user-jwt');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }) }),
      );
    });

    // Regression test: deleteDoc previously bypassed the synthetic-JWT/service-role
    // substitution, so API-key-authenticated deletes sent an unsigned JWT straight
    // to Supabase and failed signature verification.
    it('substitutes the service-role key when the JWT is synthetic (API-key auth)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
      const syntheticJwt = `synthetic.${btoa(JSON.stringify({ sub: 'user-uuid' }))}.internal`;

      await deleteDoc(env, 'abc1234', syntheticJwt);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) }),
      );
    });

    it('resolves without a value on 204', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await deleteDoc(env, 'abc1234', 'user-jwt');

      expect(result).toBeUndefined();
    });

    it('throws a RepositoryError with kind rls_denied on 403', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

      const error = await deleteDoc(env, 'abc1234', 'user-jwt').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(RepositoryError);
      expect((error as RepositoryError).kind).toBe('rls_denied');
    });
  });
});
