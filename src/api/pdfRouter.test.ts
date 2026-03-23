import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePdfRequest, type PdfRouterEnv } from './pdfRouter';

function makeR2Object(body: string): { body: ReadableStream } {
  const stream = new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode(body)); c.close(); },
  });
  return { body: stream };
}

type MockBucket = {
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function makeEnv(bucketOverrides?: Partial<MockBucket>, apiUrl?: string): PdfRouterEnv {
  const bucket: MockBucket = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    ...bucketOverrides,
  };
  return {
    PDF_BUCKET: bucket as unknown as PdfRouterEnv['PDF_BUCKET'],
    PDF_BUCKET_URL: 'https://pub-test.r2.dev/markdown-reader-pdf-temp',
    PDF2MARKDOWN_API_URL: apiUrl ?? 'https://pdf2html-stage.templify.cloud',
  };
}

function makePdfRequest(method: string, path: string, body?: BodyInit, contentType?: string): Request {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  return new Request(`https://app.prathamesh.cloud${path}`, { method, body, headers });
}

function makeMultipartRequest(file: File): Request {
  const req = new Request('https://app.prathamesh.cloud/mreader/api/pdf/convert', {
    method: 'POST',
  });
  // Avoid multipart parsing in jsdom: stub formData to return the file directly.
  Object.defineProperty(req, 'formData', {
    value: vi.fn().mockResolvedValue({ get: () => file }),
  });
  return req;
}

describe('handlePdfRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for non-PDF paths', async () => {
    const env = makeEnv();
    const result = await handlePdfRequest(makePdfRequest('GET', '/mreader/api/docs'), env);
    expect(result).toBeNull();
  });

  it('returns null for the root mreader path', async () => {
    const env = makeEnv();
    const result = await handlePdfRequest(makePdfRequest('GET', '/mreader/'), env);
    expect(result).toBeNull();
  });

  describe('POST /mreader/api/pdf/convert', () => {
    it('returns 400 when no pdf field is provided', async () => {
      const env = makeEnv();
      const fd = new FormData();
      const req = new Request('https://app.prathamesh.cloud/mreader/api/pdf/convert', {
        method: 'POST',
        body: fd,
      });

      const res = await handlePdfRequest(req, env);
      expect(res?.status).toBe(400);
    });

    it('converts PDF and returns markdown with pageCount', async () => {
      const env = makeEnv();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ markdown: '# Hello', pages_processed: 2, model_used: 'gpt-4o-mini' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      const res = await handlePdfRequest(makeMultipartRequest(file), env);

      expect(res?.status).toBe(200);
      const body = await res?.json() as { markdown: string; pageCount: number };
      expect(body.markdown).toBe('# Hello');
      expect(body.pageCount).toBe(2);
    });

    it('deletes the R2 object even when the PDF API returns 422', async () => {
      const env = makeEnv();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{}', { status: 422 }),
      );

      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      const res = await handlePdfRequest(makeMultipartRequest(file), env);

      expect(res?.status).toBe(422);
      expect(env.PDF_BUCKET.delete).toHaveBeenCalledOnce();
    });

    it('deletes the R2 object even when the PDF API returns 500', async () => {
      const env = makeEnv();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{}', { status: 500 }),
      );

      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      await handlePdfRequest(makeMultipartRequest(file), env);

      expect(env.PDF_BUCKET.delete).toHaveBeenCalledOnce();
    });

    it('returns 405 for GET on the convert path', async () => {
      const env = makeEnv();
      const res = await handlePdfRequest(makePdfRequest('GET', '/mreader/api/pdf/convert'), env);
      expect(res?.status).toBe(405);
    });
  });

  describe('GET /mreader/api/pdf/files/:key', () => {
    it('returns the PDF body with correct content type when key exists', async () => {
      const env = makeEnv({
        put: vi.fn(),
        delete: vi.fn(),
        get: vi.fn().mockResolvedValue(makeR2Object('%PDF-1.4')),
      });

      const res = await handlePdfRequest(
        makePdfRequest('GET', '/mreader/api/pdf/files/pdf-temp/123-abc'),
        env,
      );

      expect(res?.status).toBe(200);
      expect(res?.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('returns 404 when the key does not exist in R2', async () => {
      const env = makeEnv({ get: vi.fn().mockResolvedValue(null), put: vi.fn(), delete: vi.fn() });

      const res = await handlePdfRequest(
        makePdfRequest('GET', '/mreader/api/pdf/files/nonexistent'),
        env,
      );

      expect(res?.status).toBe(404);
    });

    it('returns 405 for POST on the files path', async () => {
      const env = makeEnv();
      const res = await handlePdfRequest(
        makePdfRequest('POST', '/mreader/api/pdf/files/some-key'),
        env,
      );
      expect(res?.status).toBe(405);
    });
  });
});
