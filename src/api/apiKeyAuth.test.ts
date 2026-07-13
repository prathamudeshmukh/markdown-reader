import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./repository/apiKeys', () => ({
  lookupApiKey: vi.fn(),
  touchApiKeyLastUsed: vi.fn(),
}));

import { resolveApiKey } from './apiKeyAuth';
import { lookupApiKey, touchApiKeyLastUsed } from './repository/apiKeys';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://openmark.cc/api/docs', { headers });
}

const validKey = 'omk_' + 'a'.repeat(32);

describe('resolveApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when X-OpenMark-Key header is absent', async () => {
    const result = await resolveApiKey(makeRequest(), env);
    expect(result).toBeNull();
    expect(lookupApiKey).not.toHaveBeenCalled();
  });

  it('throws 401 when header is present but key format is invalid (no omk_ prefix)', async () => {
    await expect(resolveApiKey(makeRequest({ 'X-OpenMark-Key': 'invalid_key_format_here_12345' }), env))
      .rejects.toThrow('Invalid API key');
  });

  it('throws 401 when header is present but key is too short', async () => {
    await expect(resolveApiKey(makeRequest({ 'X-OpenMark-Key': 'omk_short' }), env))
      .rejects.toThrow('Invalid API key');
  });

  it('throws 401 when key hash not found in db', async () => {
    vi.mocked(lookupApiKey).mockResolvedValueOnce(null);

    await expect(resolveApiKey(makeRequest({ 'X-OpenMark-Key': validKey }), env))
      .rejects.toThrow('Invalid API key');
  });

  it('returns ApiKeyContext when key is valid', async () => {
    vi.mocked(lookupApiKey).mockResolvedValueOnce({ id: 'key-id-1', userId: 'user-id-1' });
    vi.mocked(touchApiKeyLastUsed).mockResolvedValueOnce(undefined);

    const result = await resolveApiKey(makeRequest({ 'X-OpenMark-Key': validKey }), env);

    expect(result).toEqual({ userId: 'user-id-1', keyId: 'key-id-1' });
  });

  it('calls touchApiKeyLastUsed fire-and-forget after valid key resolves', async () => {
    vi.mocked(lookupApiKey).mockResolvedValueOnce({ id: 'key-id-1', userId: 'user-id-1' });
    vi.mocked(touchApiKeyLastUsed).mockResolvedValueOnce(undefined);

    await resolveApiKey(makeRequest({ 'X-OpenMark-Key': validKey }), env);

    expect(touchApiKeyLastUsed).toHaveBeenCalledWith(env, 'key-id-1');
  });

  it('hashes the raw key before querying (does not pass raw key to lookupApiKey)', async () => {
    vi.mocked(lookupApiKey).mockResolvedValueOnce({ id: 'key-id-1', userId: 'user-id-1' });
    vi.mocked(touchApiKeyLastUsed).mockResolvedValueOnce(undefined);

    await resolveApiKey(makeRequest({ 'X-OpenMark-Key': validKey }), env);

    const callArg = vi.mocked(lookupApiKey).mock.calls[0][1];
    expect(callArg).not.toBe(validKey);
    expect(callArg).toMatch(/^[0-9a-f]{64}$/);
  });
});
