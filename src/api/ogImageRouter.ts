import { ImageResponse } from 'workers-og';
import { getDoc } from './repository/docs';
import type { SupabaseEnv } from './repository/shared';
import { deriveTitle } from './docMeta';
import { ogImageCacheUrl, toCacheKeyRequest } from './docCacheKeys';
import { buildOgImageHtml, OG_IMAGE_FONT_NAME } from './ogImageTemplate';
import { cfCache } from './workerUtils';

export type OgImageRouterEnv = SupabaseEnv & {
  ASSETS: { fetch(request: Request): Promise<Response> };
};

const OG_IMAGE_PATH_PATTERN = /^\/api\/og\/([^/]+)\.png$/;
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const OG_IMAGE_MAX_AGE = 86400;
const OG_IMAGE_STALE_WHILE_REVALIDATE = 604800;
const OG_IMAGE_FONT_PATH = '/fonts/Inter-Bold.woff';
const OG_IMAGE_CACHE_CONTROL = `public, max-age=${OG_IMAGE_MAX_AGE}, stale-while-revalidate=${OG_IMAGE_STALE_WHILE_REVALIDATE}`;

function redirectToLogo(origin: string): Response {
  return Response.redirect(`${origin}/logo.png`, 302);
}

export async function handleOgImageRequest(request: Request, env: OgImageRouterEnv): Promise<Response | null> {
  const { pathname, origin } = new URL(request.url);
  const match = pathname.match(OG_IMAGE_PATH_PATTERN);
  if (!match) return null;

  const slug = match[1];
  const cacheKey = toCacheKeyRequest(ogImageCacheUrl(origin, slug));

  try {
    const cached = await cfCache().match(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache unavailable — fall through to a fresh render
  }

  let doc;
  try {
    doc = await getDoc(env, slug);
  } catch (err) {
    console.error('[og-image-router] getDoc failed', { slug, error: err });
    doc = null;
  }

  if (!doc) return redirectToLogo(origin);

  try {
    const fontResponse = await env.ASSETS.fetch(new Request(new URL(OG_IMAGE_FONT_PATH, origin)));
    const fontData = await fontResponse.arrayBuffer();

    const html = buildOgImageHtml(deriveTitle(doc));
    const image = new ImageResponse(html, {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fonts: [{ name: OG_IMAGE_FONT_NAME, data: fontData, weight: 700, style: 'normal' }],
    });

    const response = new Response(image.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': OG_IMAGE_CACHE_CONTROL,
      },
    });

    try {
      await cfCache().put(cacheKey, response.clone());
    } catch {
      // Cache write failure is non-fatal
    }

    return response;
  } catch (err) {
    console.error('[og-image-router] image render failed', { slug, error: err });
    return redirectToLogo(origin);
  }
}
