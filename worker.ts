import { handleDocsRequest } from './src/api/docsRouter';
import { handlePdfRequest } from './src/api/pdfRouter';
import { handleCollectionsRequest } from './src/api/collectionsRouter';
import { handleCommentsRequest } from './src/api/commentsRouter';
import { handleApiKeysRequest } from './src/api/apiKeysRouter';
import { handleMcpRequest } from './src/api/mcpRouter';
import { getDoc } from './src/api/supabaseClient';
import { deriveTitle, deriveDescription, type DocMeta } from './src/api/docMeta';
import { injectDocMeta } from './src/api/metaRewriter';
import { docPageCacheUrl, toCacheKeyRequest } from './src/api/docCacheKeys';
import { handleOgImageRequest } from './src/api/ogImageRouter';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PDF_BUCKET: R2Bucket;
  PDF2MARKDOWN_API_URL: string;
}

const OLD_HOST = 'app.prathamesh.cloud';
const OLD_PREFIX = '/mreader';
const DOC_PATH_PREFIX = '/d/';
const DOC_PAGE_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=300';

// Lazily accessed so tests can mock `caches` before the first call.
// caches.default is a Cloudflare Workers extension not in standard lib types.
function cfCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

async function handleDocPageRequest(request: Request, slug: string, env: Env): Promise<Response> {
  const indexUrl = new URL(request.url);
  indexUrl.pathname = '/';
  const indexRequest = new Request(indexUrl, request);

  const { origin } = new URL(request.url);
  const cacheKey = toCacheKeyRequest(docPageCacheUrl(origin, slug));

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
    console.error('[worker] getDoc failed for /d/:slug meta rewrite', { slug, error: err });
    doc = null;
  }

  // No doc (deleted, mistyped, or lookup failure) — serve the generic static page unmodified.
  if (!doc) return env.ASSETS.fetch(indexRequest);

  const indexResponse = await env.ASSETS.fetch(indexRequest);
  const html = await indexResponse.text();

  const meta: DocMeta = {
    title: deriveTitle(doc),
    description: deriveDescription(doc),
    url: `${origin}${DOC_PATH_PREFIX}${slug}`,
    imageUrl: `${origin}/api/og/${slug}.png`,
  };

  const response = new Response(injectDocMeta(html, meta), {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': DOC_PAGE_CACHE_CONTROL,
    },
  });

  try {
    await cfCache().put(cacheKey, response.clone());
  } catch {
    // Cache write failure is non-fatal
  }

  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Redirect legacy domain to openmark.cc, stripping the /mreader prefix
    if (url.hostname === OLD_HOST) {
      const newPath = url.pathname.startsWith(OLD_PREFIX)
        ? url.pathname.slice(OLD_PREFIX.length) || '/'
        : url.pathname;
      return Response.redirect(`https://openmark.cc${newPath}${url.search}`, 301);
    }

    // Validate required secrets are bound
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
      const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
        .filter((k) => !env[k as keyof Env])
        .join(', ');
      console.error(`Missing env: ${missing}`);
      return new Response(JSON.stringify({ error: `Server misconfigured: missing ${missing}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // MCP endpoint — checked before all other routes
    const mcpResponse = await handleMcpRequest(request, env);
    if (mcpResponse) return mcpResponse;

    // API key management
    const apiKeysResponse = await handleApiKeysRequest(request, env);
    if (apiKeysResponse) return apiKeysResponse;

    // PDF routes — checked before docs API
    const pdfResponse = await handlePdfRequest(request, env);
    if (pdfResponse) return pdfResponse;

    // API routes — checked before asset fallback
    const collectionsResponse = await handleCollectionsRequest(request, env);
    if (collectionsResponse) return collectionsResponse;

    const commentsResponse = await handleCommentsRequest(request, env);
    if (commentsResponse) return commentsResponse;

    const apiResponse = await handleDocsRequest(request, env);
    if (apiResponse) return apiResponse;

    // OG image generation — checked before asset fallback
    const ogImageResponse = await handleOgImageRequest(request, env);
    if (ogImageResponse) return ogImageResponse;

    // /d/:slug: rewrite social-preview meta tags for the doc, cached per-slug
    if (url.pathname.startsWith(DOC_PATH_PREFIX)) {
      const slug = url.pathname.slice(DOC_PATH_PREFIX.length);
      return handleDocPageRequest(request, slug, env);
    }

    // Static assets
    return env.ASSETS.fetch(request);
  },
};
