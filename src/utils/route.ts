const SLUG_PATH_PREFIX = '/mreader/d/';

export function getSlugFromPath(pathname = window.location.pathname): string | null {
  if (!pathname.startsWith(SLUG_PATH_PREFIX)) return null;
  const slug = pathname.slice(SLUG_PATH_PREFIX.length);
  return slug.length > 0 ? slug : null;
}
