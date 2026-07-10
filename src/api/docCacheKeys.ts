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
