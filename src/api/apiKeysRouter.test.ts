import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  insertApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  deleteApiKey: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'aaaabbbbccccddddeeeeffffgggghhhh'),
}));

import { handleApiKeysRequest } from './apiKeysRouter';
import { insertApiKey, listApiKeys, deleteApiKey } from './supabaseClient';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

const userId = 'user-uuid-1234';
const jwtPayload = btoa(JSON.stringify({ sub: userId }));
const fakeJwt = `header.${jwtPayload}.sig`;

function makeRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>): Request {
  return new Request(`https://openmark.cc${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('handleApiKeysRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for non-api/keys paths', async () => {
    const res = await handleApiKeysRequest(makeRequest('GET', '/api/docs'), env);
    expect(res).toBeNull();
  });

  describe('GET /api/keys', () => {
    it('returns 401 when no Authorization header', async () => {
      const res = await handleApiKeysRequest(makeRequest('GET', '/api/keys'), env);
      expect(res?.status).toBe(401);
    });

    it('returns list of keys without key_hash field', async () => {
      const keys = [
        { id: 'key-1', label: 'CI bot', created_at: '2026-01-01T00:00:00Z', last_used_at: null },
      ];
      vi.mocked(listApiKeys).mockResolvedValueOnce(keys);

      const res = await handleApiKeysRequest(
        makeRequest('GET', '/api/keys', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { keys: typeof keys };
      expect(body.keys).toEqual(keys);
      expect(JSON.stringify(body)).not.toContain('key_hash');
    });
  });

  describe('POST /api/keys', () => {
    it('returns 401 when no Authorization header', async () => {
      const res = await handleApiKeysRequest(makeRequest('POST', '/api/keys', { label: 'test' }), env);
      expect(res?.status).toBe(401);
    });

    it('returns 400 when label is missing', async () => {
      const res = await handleApiKeysRequest(
        makeRequest('POST', '/api/keys', {}, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 400 when label is empty string', async () => {
      const res = await handleApiKeysRequest(
        makeRequest('POST', '/api/keys', { label: '' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 400 when label exceeds 100 chars', async () => {
      const res = await handleApiKeysRequest(
        makeRequest('POST', '/api/keys', { label: 'a'.repeat(101) }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(400);
    });

    it('returns 201 with id, label, key (omk_ prefix) and createdAt on success', async () => {
      vi.mocked(insertApiKey).mockResolvedValueOnce({
        id: 'new-key-id',
        label: 'CI bot',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
      });

      const res = await handleApiKeysRequest(
        makeRequest('POST', '/api/keys', { label: 'CI bot' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(201);
      const body = await res?.json() as { id: string; label: string; key: string; createdAt: string };
      expect(body.id).toBe('new-key-id');
      expect(body.label).toBe('CI bot');
      expect(body.key).toMatch(/^omk_/);
      expect(body.key.length).toBe(4 + 32);
      expect(body.createdAt).toBe('2026-01-01T00:00:00Z');
    });

    it('does not expose key_hash in response', async () => {
      vi.mocked(insertApiKey).mockResolvedValueOnce({
        id: 'new-key-id',
        label: 'CI bot',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
      });

      const res = await handleApiKeysRequest(
        makeRequest('POST', '/api/keys', { label: 'CI bot' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      const body = JSON.stringify(await res?.json());
      expect(body).not.toContain('key_hash');
    });

    it('stores SHA-256 hash of raw key, not raw key itself', async () => {
      vi.mocked(insertApiKey).mockResolvedValueOnce({
        id: 'new-key-id',
        label: 'CI bot',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
      });

      await handleApiKeysRequest(
        makeRequest('POST', '/api/keys', { label: 'CI bot' }, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      const callArgs = vi.mocked(insertApiKey).mock.calls[0];
      expect(callArgs[1].keyHash).not.toMatch(/^omk_/);
      expect(callArgs[1].keyHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('DELETE /api/keys/:id', () => {
    it('returns 401 when no Authorization header', async () => {
      const res = await handleApiKeysRequest(makeRequest('DELETE', '/api/keys/key-1'), env);
      expect(res?.status).toBe(401);
    });

    it('returns 204 on successful delete', async () => {
      vi.mocked(deleteApiKey).mockResolvedValueOnce(undefined);

      const res = await handleApiKeysRequest(
        makeRequest('DELETE', '/api/keys/key-1', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );

      expect(res?.status).toBe(204);
      expect(deleteApiKey).toHaveBeenCalledWith(env, 'key-1', userId, fakeJwt);
    });

    it('returns 400 when key id is missing', async () => {
      const res = await handleApiKeysRequest(
        makeRequest('DELETE', '/api/keys/', undefined, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(400);
    });
  });

  describe('unsupported methods', () => {
    it('returns 405 for PUT on /api/keys', async () => {
      const res = await handleApiKeysRequest(
        makeRequest('PUT', '/api/keys', {}, { Authorization: `Bearer ${fakeJwt}` }),
        env,
      );
      expect(res?.status).toBe(405);
    });
  });
});
