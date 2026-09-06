import { getDoc } from './repository/docs';
import type { SupabaseEnv } from './repository/shared';
import { json, extractBearerToken, extractUserIdFromJwt } from './workerUtils';

interface R2PutOptions {
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(key: string, value: Blob | ArrayBuffer | ReadableStream | string, options?: R2PutOptions): Promise<unknown>;
}

export interface ImageRouterEnv extends SupabaseEnv {
  IMAGE_BUCKET: R2Bucket;
  IMAGE_BUCKET_URL: string;
}

const UPLOAD_PATH = '/api/images/upload';

const MAX_IMAGE_BYTES = 10_000_000; // 10 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return sanitized.slice(0, 100);
}

async function handleUpload(request: Request, env: ImageRouterEnv): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error('[image-router] Failed to parse multipart form data', err);
    return json({ error: 'Invalid multipart form data' }, 400);
  }

  const file = formData.get('image');
  if (!(file instanceof File)) {
    console.warn('[image-router] Request missing "image" field');
    return json({ error: 'No image file provided in "image" field' }, 400);
  }

  const slug = formData.get('slug');
  if (typeof slug !== 'string' || slug.length === 0) {
    console.warn('[image-router] Request missing "slug" field');
    return json({ error: 'slug is required' }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    console.warn('[image-router] Unsupported image type', { type: file.type });
    return json({ error: 'Unsupported image type' }, 400);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    console.warn('[image-router] Image too large', { sizeBytes: file.size, limitBytes: MAX_IMAGE_BYTES });
    return json({ error: 'Image exceeds the 10 MB limit' }, 413);
  }

  const doc = await getDoc(env, slug);
  if (!doc) return json({ error: 'Not found' }, 404);

  const userJwt = extractBearerToken(request);
  const requesterId = extractUserIdFromJwt(userJwt ?? '');
  // Same rule as docsRouter.ts's handlePut: unowned docs remain editable by
  // anyone; owned docs require ownership or editAccess.
  if (doc.userId !== null && !doc.editAccess && doc.userId !== requesterId) {
    return json({ error: 'Forbidden' }, 403);
  }

  const key = `images/${slug}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

  try {
    await env.IMAGE_BUCKET.put(key, file, { httpMetadata: { contentType: file.type } });
    console.info('[image-router] Image uploaded to R2', { key, sizeBytes: file.size });
  } catch (err) {
    console.error('[image-router] R2 upload failed', { key, error: err });
    return json({ error: 'Failed to store image' }, 500);
  }

  const url = `${env.IMAGE_BUCKET_URL.replace(/\/$/, '')}/${key}`;
  return json({ url }, 201);
}

export async function handleImageRequest(
  request: Request,
  env: ImageRouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);

  if (pathname === UPLOAD_PATH) {
    if (request.method === 'POST') return handleUpload(request, env);
    return json({ error: 'Method not allowed' }, 405);
  }

  return null;
}
