import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImage, ImageApiError } from './imageApiClient';
import { setAuthToken } from './authToken';

function makeFile(): File {
  return new File(['x'], 'photo.png', { type: 'image/png' });
}

describe('uploadImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setAuthToken(undefined);
  });

  it('attaches the bearer token so the Worker can verify doc ownership', async () => {
    setAuthToken('jwt-123');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ url: 'x' }), { status: 201 }));

    await uploadImage(makeFile(), 'abc1234');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-123' });
  });

  it('sends no Authorization header when signed out', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ url: 'x' }), { status: 201 }));

    await uploadImage(makeFile(), 'abc1234');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('returns the url on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://cdn.example/photo.png' }), { status: 201 }),
    );

    const result = await uploadImage(makeFile(), 'abc1234');
    expect(result.url).toBe('https://cdn.example/photo.png');
  });

  it('sends the file and slug as multipart form data', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ url: 'x' }), { status: 201 }));

    await uploadImage(makeFile(), 'abc1234');

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/images/upload');
    const body = init.body as FormData;
    expect(body.get('slug')).toBe('abc1234');
    expect((body.get('image') as File).name).toBe('photo.png');
  });

  it.each([
    [400, 'INVALID_TYPE'],
    [403, 'FORBIDDEN'],
    [413, 'TOO_LARGE'],
    [500, 'UPLOAD_FAILED'],
  ] as const)('maps HTTP %i to error code %s', async (status, code) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));

    await expect(uploadImage(makeFile(), 'abc1234')).rejects.toMatchObject({ code });
  });

  it('maps a rejected fetch to NETWORK_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(uploadImage(makeFile(), 'abc1234')).rejects.toBeInstanceOf(ImageApiError);
    await expect(uploadImage(makeFile(), 'abc1234')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
