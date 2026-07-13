import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiKeyAuth', () => ({
  resolveApiKey: vi.fn(),
}));

vi.mock('./repository/docs', () => ({
  createDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc1234'),
}));

import { handleMcpRequest } from './mcpRouter';
import { resolveApiKey } from './apiKeyAuth';
import { createDoc, getDoc, updateDoc } from './repository/docs';

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

const userId = 'user-uuid-1234';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://openmark.cc/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeOptionsRequest(): Request {
  return new Request('https://openmark.cc/mcp', { method: 'OPTIONS' });
}

function makeGetRequest(): Request {
  return new Request('https://openmark.cc/api/docs', { method: 'GET' });
}

describe('handleMcpRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveApiKey).mockResolvedValue(null);
  });

  it('returns null for non-/mcp paths', async () => {
    const res = await handleMcpRequest(makeGetRequest(), env);
    expect(res).toBeNull();
  });

  describe('OPTIONS /mcp', () => {
    it('returns CORS headers without auth', async () => {
      const res = await handleMcpRequest(makeOptionsRequest(), env);
      expect(res?.status).toBe(200);
      expect(res?.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res?.headers.get('Access-Control-Allow-Headers')).toContain('X-OpenMark-Key');
    });
  });

  describe('initialize', () => {
    it('returns server capabilities without auth', async () => {
      const res = await handleMcpRequest(
        makeRequest({ jsonrpc: '2.0', id: '1', method: 'initialize', params: {} }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { result: { protocolVersion: string; serverInfo: { name: string }; capabilities: unknown } };
      expect(body.result.protocolVersion).toBe('2025-03-26');
      expect(body.result.serverInfo.name).toBe('openmark');
      expect(body.result.capabilities).toHaveProperty('tools');
    });
  });

  describe('tools/list', () => {
    it('returns all three tool definitions with valid API key', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });

      const res = await handleMcpRequest(
        makeRequest({ jsonrpc: '2.0', id: '2', method: 'tools/list', params: {} },
          { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { result: { tools: Array<{ name: string }> } };
      const names = body.result.tools.map((t) => t.name);
      expect(names).toContain('openmark_create_doc');
      expect(names).toContain('openmark_read_doc');
      expect(names).toContain('openmark_update_doc');
    });

    it('returns error -32001 when API key is missing', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce(null);

      const res = await handleMcpRequest(
        makeRequest({ jsonrpc: '2.0', id: '2', method: 'tools/list', params: {} }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32001);
    });

    it('returns error -32001 when API key is invalid', async () => {
      vi.mocked(resolveApiKey).mockRejectedValueOnce(new Error('Invalid API key'));

      const res = await handleMcpRequest(
        makeRequest({ jsonrpc: '2.0', id: '2', method: 'tools/list', params: {} },
          { 'X-OpenMark-Key': 'omk_bad' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32001);
    });
  });

  describe('tools/call — openmark_create_doc', () => {
    it('returns Created URL on success', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(createDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hello', title: null, userId: userId, collectionId: null, creatorToken: null, editAccess: false });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '3', method: 'tools/call',
          params: { name: 'openmark_create_doc', arguments: { content: '# Hello' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { result: { content: Array<{ type: string; text: string }> } };
      expect(body.result.content[0].text).toMatch(/Created:/);
      expect(body.result.content[0].text).toContain('abc1234');
    });

    it('returns error -32602 when content is missing', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '3', method: 'tools/call',
          params: { name: 'openmark_create_doc', arguments: {} },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32602);
    });

    it('returns error -32602 when content exceeds 500 KB', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '3', method: 'tools/call',
          params: { name: 'openmark_create_doc', arguments: { content: 'x'.repeat(500_001) } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32602);
    });
  });

  describe('tools/call — openmark_read_doc', () => {
    it('returns formatted title, URL, and content', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Design', title: 'Design Doc', userId: userId, collectionId: null, creatorToken: null, editAccess: false });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '4', method: 'tools/call',
          params: { name: 'openmark_read_doc', arguments: { slug: 'abc1234' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { result: { content: Array<{ text: string }> } };
      expect(body.result.content[0].text).toContain('Design Doc');
      expect(body.result.content[0].text).toContain('abc1234');
      expect(body.result.content[0].text).toContain('# Design');
    });

    it('returns error -32602 when doc not found', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '4', method: 'tools/call',
          params: { name: 'openmark_read_doc', arguments: { slug: 'missing' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number; message: string } };
      expect(body.error.code).toBe(-32602);
      expect(body.error.message).toContain('not found');
    });

    it('strips URL prefix when full URL is provided as slug', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Hi', title: null, userId: userId, collectionId: null, creatorToken: null, editAccess: false });

      await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '4', method: 'tools/call',
          params: { name: 'openmark_read_doc', arguments: { slug: 'https://openmark.cc/d/abc1234' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      expect(getDoc).toHaveBeenCalledWith(env, 'abc1234');
    });
  });

  describe('tools/call — openmark_update_doc', () => {
    it('returns Updated URL on success', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Old', title: null, userId: userId, collectionId: null, creatorToken: null, editAccess: false });
      vi.mocked(updateDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# New', title: null, userId: userId, collectionId: null, creatorToken: null, editAccess: false });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '5', method: 'tools/call',
          params: { name: 'openmark_update_doc', arguments: { slug: 'abc1234', content: '# New' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      expect(res?.status).toBe(200);
      const body = await res?.json() as { result: { content: Array<{ text: string }> } };
      expect(body.result.content[0].text).toMatch(/Updated:/);
    });

    it('returns error -32602 when doc not found during update', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(getDoc).mockResolvedValueOnce(null);

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '5', method: 'tools/call',
          params: { name: 'openmark_update_doc', arguments: { slug: 'missing', content: '# New' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32602);
    });

    it('returns error -32602 when user does not own the doc', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });
      vi.mocked(getDoc).mockResolvedValueOnce({ slug: 'abc1234', content: '# Old', title: null, userId: 'other-user', collectionId: null, creatorToken: null, editAccess: false });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '5', method: 'tools/call',
          params: { name: 'openmark_update_doc', arguments: { slug: 'abc1234', content: '# New' } },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32602);
    });
  });

  describe('unknown tool', () => {
    it('returns error -32602 for unknown tool name', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });

      const res = await handleMcpRequest(
        makeRequest({
          jsonrpc: '2.0', id: '6', method: 'tools/call',
          params: { name: 'openmark_nonexistent', arguments: {} },
        }, { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32602);
    });
  });

  describe('batch request', () => {
    it('returns error -32600 for batch (array) request', async () => {
      const res = await handleMcpRequest(
        new Request('https://openmark.cc/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ jsonrpc: '2.0', id: '1', method: 'initialize' }]),
        }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32600);
    });
  });

  describe('unknown method', () => {
    it('returns method-not-found error for unknown JSON-RPC method', async () => {
      vi.mocked(resolveApiKey).mockResolvedValueOnce({ userId, keyId: 'k1' });

      const res = await handleMcpRequest(
        makeRequest({ jsonrpc: '2.0', id: '7', method: 'unknown/method' },
          { 'X-OpenMark-Key': 'omk_valid' }),
        env,
      );

      const body = await res?.json() as { error: { code: number } };
      expect(body.error.code).toBe(-32601);
    });
  });
});
