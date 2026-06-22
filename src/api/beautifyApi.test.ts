import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { beautifyMarkdown } from './beautifyApi';

const validResult = {
  theme: 'technical',
  accent: '#6366f1',
  nodes: [{ type: 'hero', title: 'Test' }],
};

describe('beautifyMarkdown', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/beautify and returns parsed result', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(validResult), { status: 200 }),
    );

    const result = await beautifyMarkdown('# Hello');
    expect(result).toEqual(validResult);
    expect(fetch).toHaveBeenCalledWith(
      '/api/beautify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws with the server error message on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Content too large for AI beautification (max 30 000 chars)' }), { status: 413 }),
    );

    await expect(beautifyMarkdown('# Hello')).rejects.toThrow('Content too large');
  });

  it('throws a fallback message when server response has no error field', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    await expect(beautifyMarkdown('# Hello')).rejects.toThrow('HTTP 500');
  });
});
