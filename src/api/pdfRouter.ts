interface R2PutOptions {
  httpMetadata?: { contentType?: string };
}

interface R2ObjectBody {
  body: ReadableStream;
}

interface R2PutResult {
  key: string;
  size: number;
  etag: string;
}

interface R2Bucket {
  put(key: string, value: Blob | ArrayBuffer | ReadableStream | string, options?: R2PutOptions): Promise<R2PutResult>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

export interface PdfRouterEnv {
  PDF_BUCKET: R2Bucket;
  PDF_BUCKET_URL: string;
  PDF2MARKDOWN_API_URL: string;
}

const CONVERT_PATH = '/mreader/api/pdf/convert';
const FILES_PREFIX = '/mreader/api/pdf/files/';

const MAX_PDF_BYTES = 20_000_000; // 20 MB

interface PdfApiResponse {
  markdown: string;
  pages_processed: number;
  model_used: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleConvert(request: Request, env: PdfRouterEnv): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error('[pdf-router] Failed to parse multipart form data', err);
    return json({ error: 'Invalid multipart form data' }, 400);
  }

  const file = formData.get('pdf');
  if (!(file instanceof File)) {
    console.warn('[pdf-router] Request missing "pdf" field');
    return json({ error: 'No PDF file provided in "pdf" field' }, 400);
  }

  if (file.size > MAX_PDF_BYTES) {
    console.warn('[pdf-router] PDF too large', { sizeBytes: file.size, limitBytes: MAX_PDF_BYTES });
    return json({ error: 'PDF file exceeds the 20 MB limit' }, 413);
  }

  const key = `pdf-temp/${Date.now()}-${crypto.randomUUID()}`;
  const fileUrl = `${env.PDF_BUCKET_URL.replace(/\/$/, '')}/${key}`;

  try {
    const putResult = await env.PDF_BUCKET.put(key, file, { httpMetadata: { contentType: 'application/pdf' } });
    console.info('[pdf-router] PDF uploaded to R2', { key, sizeBytes: file.size, putResult });

    const verify = await env.PDF_BUCKET.get(key);
    if (!verify) {
      console.error('[pdf-router] R2 read-back failed — file not found after put', { key });
      return json({ error: 'Failed to store PDF for conversion' }, 500);
    }
    console.info('[pdf-router] R2 read-back confirmed file exists', { key });
  } catch (err) {
    console.error('[pdf-router] R2 upload failed', { key, error: err });
    return json({ error: 'Failed to store PDF for conversion' }, 500);
  }

  try {
    console.info('[pdf-router] Calling PDF conversion API', { fileUrl });
    const apiResponse = await fetch(`${env.PDF2MARKDOWN_API_URL}/convert/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_url: fileUrl, model: 'gpt-5.4-mini' }),
    });

    if (apiResponse.status === 422) {
      console.warn('[pdf-router] PDF conversion API rejected request (422)', { fileUrl });
      return json({ error: 'Invalid PDF URL or request' }, 422);
    }

    if (!apiResponse.ok) {
      console.error('[pdf-router] PDF conversion API error', { status: apiResponse.status, fileUrl });
      return json({ error: 'PDF conversion service failed' }, 500);
    }

    const data = (await apiResponse.json()) as PdfApiResponse;
    console.info('[pdf-router] PDF conversion succeeded', { pagesProcessed: data.pages_processed, model: data.model_used });
    return json({ markdown: data.markdown, pageCount: data.pages_processed });
  } finally {
    // await env.PDF_BUCKET.delete(key)
    //   .then(() => console.info('[pdf-router] Deleted R2 temp file', { key }))
    //   .catch((err: unknown) => console.error('[pdf-router] Failed to delete R2 temp file', { key, error: err }));
  }
}

async function handleFileGet(key: string, env: PdfRouterEnv): Promise<Response> {
  const object = await env.PDF_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: { 'Content-Type': 'application/pdf' },
  });
}

export async function handlePdfRequest(
  request: Request,
  env: PdfRouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const { method } = request;

  if (pathname === CONVERT_PATH) {
    if (method === 'POST') return handleConvert(request, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  if (pathname.startsWith(FILES_PREFIX)) {
    const key = pathname.slice(FILES_PREFIX.length);
    if (!key) return json({ error: 'Not found' }, 404);
    if (method === 'GET') return handleFileGet(key, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
