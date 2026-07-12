import { cfCache } from './workerUtils';

const API_DOCS_PREFIX = '/api/docs';
const DOC_PAGE_PREFIX = '/d';
const OG_IMAGE_PREFIX = '/api/og';

export function docJsonCacheUrl(origin: string, slug: string): string {
  return `${origin}${API_DOCS_PREFIX}/${slug}`;
}

export function docPageCacheUrl(origin: string, slug: string): string {
  return `${origin}${DOC_PAGE_PREFIX}/${slug}`;
}

export function ogImageCacheUrl(origin: string, slug: string): string {
  return `${origin}${OG_IMAGE_PREFIX}/${slug}.png`;
}

export function toCacheKeyRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

export async function invalidateDocCaches(origin: string, slug: string): Promise<void> {
  const urls = [docJsonCacheUrl(origin, slug), docPageCacheUrl(origin, slug), ogImageCacheUrl(origin, slug)];
  await Promise.all(
    urls.map(async (url) => {
      try {
        await cfCache().delete(toCacheKeyRequest(url));
      } catch {
        // Cache invalidation failure is non-fatal — DB is source of truth
      }
    }),
  );
}
