import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { handleBeautifyRequest } from './beautifyRouter';

const env = { ANTHROPIC_API_KEY: 'sk-test' };

function makeRequest(body: unknown): Request {
  return new Request('https://app.example.com/api/beautify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validResult = {
  theme: 'technical',
  accent: '#6366f1',
  nodes: [{ type: 'hero', title: 'Hello' }],
};

describe('handleBeautifyRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for non-beautify paths', async () => {
    const req = new Request('https://app.example.com/api/docs', { method: 'POST' });
    expect(await handleBeautifyRequest(req, env)).toBeNull();
  });

  it('returns null for GET on /api/beautify', async () => {
    const req = new Request('https://app.example.com/api/beautify', { method: 'GET' });
    expect(await handleBeautifyRequest(req, env)).toBeNull();
  });

  it('returns 400 when content is missing', async () => {
    const res = await handleBeautifyRequest(makeRequest({}), env);
    expect(res?.status).toBe(400);
    const body = await res?.json() as { error: string };
    expect(body.error).toMatch(/content/);
  });

  it('returns 400 when content is not a string', async () => {
    const res = await handleBeautifyRequest(makeRequest({ content: 42 }), env);
    expect(res?.status).toBe(400);
  });

  it('returns 413 when content exceeds 30 000 chars', async () => {
    const res = await handleBeautifyRequest(makeRequest({ content: 'a'.repeat(30_001) }), env);
    expect(res?.status).toBe(413);
    const body = await res?.json() as { error: string };
    expect(body.error).toMatch(/30 000/);
  });

  it('returns 200 with BeautifyResult on happy path', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validResult) }],
    });

    const res = await handleBeautifyRequest(makeRequest({ content: '# Hello' }), env);
    expect(res?.status).toBe(200);
    const body = await res?.json();
    expect(body).toEqual(validResult);
  });

  it('returns 422 when Claude returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all' }],
    });

    const res = await handleBeautifyRequest(makeRequest({ content: '# Hello' }), env);
    expect(res?.status).toBe(422);
    const body = await res?.json() as { error: string };
    expect(body.error).toMatch(/invalid/i);
  });

  it('returns 422 when Claude returns JSON that fails schema validation', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ theme: 'unknown', accent: '#fff', nodes: [] }) }],
    });

    const res = await handleBeautifyRequest(makeRequest({ content: '# Hello' }), env);
    expect(res?.status).toBe(422);
  });

  it('returns 500 when the Anthropic API throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API down'));

    const res = await handleBeautifyRequest(makeRequest({ content: '# Hello' }), env);
    expect(res?.status).toBe(500);
    const body = await res?.json() as { error: string };
    expect(body.error).toMatch(/beautification failed/i);
  });
});
