import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabaseClient', () => ({
  getDoc: vi.fn(),
}));

vi.mock('workers-og', () => ({
  ImageResponse: vi.fn().mockImplementation(
    () =>
      new Response('fake-png-bytes', {
        headers: { 'Content-Type': 'image/png' },
      }),
  ),
}));

import { handleOgImageRequest } from './ogImageRouter';
import { getDoc } from './supabaseClient';
import { ImageResponse } from 'workers-og';

const mockCache = {
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
};

Object.defineProperty(global, 'caches', {
  value: { default: mockCache },
  writable: true,
  configurable: true,
});

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  ASSETS: {
    fetch: vi.fn().mockResolvedValue(new Response(new ArrayBuffer(8))),
  },
};

function makeRequest(path: string): Request {
  return new Request(`https://openmark.cc${path}`);
}

describe('handleOgImageRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.match.mockResolvedValue(undefined);
    mockCache.put.mockResolvedValue(undefined);
    env.ASSETS.fetch.mockResolvedValue(new Response(new ArrayBuffer(8)));
  });

  it('returns null for paths that are not /api/og/:slug.png', async () => {
    expect(await handleOgImageRequest(makeRequest('/api/docs/abc1234'), env)).toBeNull();
  });

  it('fetches the doc and renders an image for a known slug', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      slug: 'abc1234',
      content: '# My Doc',
      title: null,
      user_id: null,
      collection_id: null,
      creator_token: null,
      edit_access: false,
    });

    const response = await handleOgImageRequest(makeRequest('/api/og/abc1234.png'), env);

    expect(getDoc).toHaveBeenCalledWith(env, 'abc1234');
    expect(ImageResponse).toHaveBeenCalledWith(expect.stringContaining('My Doc'), expect.any(Object));
    expect(response?.headers.get('Content-Type')).toBe('image/png');
  });

  it('redirects to /logo.png for an unknown slug without calling ImageResponse', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(null);

    const response = await handleOgImageRequest(makeRequest('/api/og/doesnotexist.png'), env);

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toBe('https://openmark.cc/logo.png');
    expect(ImageResponse).not.toHaveBeenCalled();
  });

  it('redirects to /logo.png when getDoc throws', async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('db down'));

    const response = await handleOgImageRequest(makeRequest('/api/og/abc1234.png'), env);

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toBe('https://openmark.cc/logo.png');
  });

  it('sets Cache-Control with the expected max-age and stale-while-revalidate', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      slug: 'abc1234',
      content: '# My Doc',
      title: null,
      user_id: null,
      collection_id: null,
      creator_token: null,
      edit_access: false,
    });

    const response = await handleOgImageRequest(makeRequest('/api/og/abc1234.png'), env);

    expect(response?.headers.get('Cache-Control')).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });

  it('truncates an overly long title so it does not overflow the image canvas', async () => {
    const longTitle = 'Extremely Long Document Title That Just Keeps Going And Going '.repeat(4).trim();
    vi.mocked(getDoc).mockResolvedValueOnce({
      slug: 'abc1234',
      content: 'body',
      title: longTitle,
      user_id: null,
      collection_id: null,
      creator_token: null,
      edit_access: false,
    });

    await handleOgImageRequest(makeRequest('/api/og/abc1234.png'), env);

    const [renderedHtml] = vi.mocked(ImageResponse).mock.calls[0];
    expect(renderedHtml).not.toContain(longTitle);
    expect(renderedHtml).toContain('…');
  });

  it('returns the cached response without calling getDoc again on a cache hit', async () => {
    const cachedResponse = new Response('cached-png-bytes', { headers: { 'Content-Type': 'image/png' } });
    mockCache.match.mockResolvedValueOnce(cachedResponse);

    const response = await handleOgImageRequest(makeRequest('/api/og/abc1234.png'), env);

    expect(response).toBe(cachedResponse);
    expect(getDoc).not.toHaveBeenCalled();
  });
});
