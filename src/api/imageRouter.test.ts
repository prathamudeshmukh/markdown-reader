import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./repository/docs', () => ({
  getDoc: vi.fn(),
}));

import { getDoc } from './repository/docs';
import { handleImageRequest, type ImageRouterEnv } from './imageRouter';
import type { Doc } from './repository/docs';

type MockBucket = {
  put: ReturnType<typeof vi.fn>;
};

function makeEnv(bucketOverrides?: Partial<MockBucket>): ImageRouterEnv {
  const bucket: MockBucket = {
    put: vi.fn().mockResolvedValue(undefined),
    ...bucketOverrides,
  };
  return {
    IMAGE_BUCKET: bucket as unknown as ImageRouterEnv['IMAGE_BUCKET'],
    IMAGE_BUCKET_URL: 'https://pub-test.r2.dev/openmark-images',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  };
}

function makeDoc(overrides?: Partial<Doc>): Doc {
  return {
    slug: 'abc1234',
    content: '',
    title: null,
    userId: null,
    collectionId: null,
    creatorToken: null,
    editAccess: false,
    ...overrides,
  };
}

// btoa(JSON.stringify({ sub: userId })) wrapped as a fake JWT — the same
// shape extractUserIdFromJwt expects (header.payload.signature).
function fakeJwt(userId: string): string {
  return `header.${btoa(JSON.stringify({ sub: userId }))}.sig`;
}

function makeUploadRequest(file: File, slug: string, jwt?: string): Request {
  const headers: Record<string, string> = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const req = new Request('https://openmark.cc/api/images/upload', {
    method: 'POST',
    headers,
  });
  // Avoid multipart parsing in jsdom: stub formData to return the fields directly.
  Object.defineProperty(req, 'formData', {
    value: vi.fn().mockResolvedValue({
      get: (key: string) => (key === 'image' ? file : key === 'slug' ? slug : null),
    }),
  });
  return req;
}

describe('handleImageRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for non-image paths', async () => {
    const env = makeEnv();
    const result = await handleImageRequest(new Request('https://openmark.cc/api/docs'), env);
    expect(result).toBeNull();
  });

  it('returns 405 for GET on the upload path', async () => {
    const env = makeEnv();
    const res = await handleImageRequest(
      new Request('https://openmark.cc/api/images/upload', { method: 'GET' }),
      env,
    );
    expect(res?.status).toBe(405);
  });

  describe('POST /api/images/upload', () => {
    it('returns 400 when no image field is provided', async () => {
      const env = makeEnv();
      const req = makeUploadRequest(null as unknown as File, 'abc1234');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(400);
    });

    it('returns 400 when slug is missing', async () => {
      const env = makeEnv();
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, '');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(400);
    });

    it('returns 400 for an unsupported image type', async () => {
      const env = makeEnv();
      const file = new File(['x'], 'diagram.svg', { type: 'image/svg+xml' });
      const req = makeUploadRequest(file, 'abc1234');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(400);
    });

    it('returns 413 when the image exceeds the 10 MB limit', async () => {
      const env = makeEnv();
      const big = new Uint8Array(10_000_001);
      const file = new File([big], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(413);
    });

    it('returns 404 when the doc does not exist', async () => {
      const env = makeEnv();
      vi.mocked(getDoc).mockResolvedValueOnce(null);
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'missing');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(404);
    });

    it('returns 403 when the doc is owned, editAccess is off, and the requester is a different user', async () => {
      const env = makeEnv();
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ userId: 'owner-1', editAccess: false }));
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234', fakeJwt('someone-else'));
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(403);
    });

    it('succeeds on an unowned doc with no auth', async () => {
      const env = makeEnv();
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ userId: null }));
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(201);
    });

    it('succeeds on an owned doc with editAccess true, from a different user', async () => {
      const env = makeEnv();
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ userId: 'owner-1', editAccess: true }));
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234', fakeJwt('someone-else'));
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(201);
    });

    it('succeeds when the requester is the owner', async () => {
      const env = makeEnv();
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ userId: 'owner-1', editAccess: false }));
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234', fakeJwt('owner-1'));
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(201);
    });

    it('uploads to R2 and returns a URL containing the slug and sanitized filename', async () => {
      const env = makeEnv();
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ slug: 'abc1234', userId: null }));
      const file = new File(['x'], 'my photo!.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234');
      const res = await handleImageRequest(req, env);

      expect(res?.status).toBe(201);
      const body = (await res?.json()) as { url: string };
      expect(body.url).toContain('https://pub-test.r2.dev/openmark-images/images/abc1234/');
      expect(body.url).toContain('my-photo-.png');
      expect(env.IMAGE_BUCKET.put).toHaveBeenCalledOnce();
    });

    it('returns 500 when the R2 write fails', async () => {
      const env = makeEnv({ put: vi.fn().mockRejectedValue(new Error('R2 down')) });
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ userId: null }));
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const req = makeUploadRequest(file, 'abc1234');
      const res = await handleImageRequest(req, env);
      expect(res?.status).toBe(500);
    });
  });
});
