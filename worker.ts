import { handleDocsRequest } from './src/api/docsRouter';
import { handlePdfRequest } from './src/api/pdfRouter';
import { handleCollectionsRequest } from './src/api/collectionsRouter';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PDF_BUCKET: R2Bucket;
  PDF2MARKDOWN_API_URL: string;
}

const PREFIX = '/mreader';
const DOC_PATH_PREFIX = '/mreader/d/';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith(PREFIX)) {
      return new Response('Not Found', { status: 404 });
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

    // PDF routes — checked before docs API
    const pdfResponse = await handlePdfRequest(request, env);
    if (pdfResponse) return pdfResponse;

    // API routes — checked before asset fallback
    const collectionsResponse = await handleCollectionsRequest(request, env);
    if (collectionsResponse) return collectionsResponse;

    const apiResponse = await handleDocsRequest(request, env);
    if (apiResponse) return apiResponse;

    // SPA rewrite: serve index.html for all /mreader/d/:slug paths
    if (url.pathname.startsWith(DOC_PATH_PREFIX)) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = '/';
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    // Static assets
    const stripped = url.pathname.slice(PREFIX.length) || '/';
    const assetUrl = new URL(request.url);
    assetUrl.pathname = stripped;
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
