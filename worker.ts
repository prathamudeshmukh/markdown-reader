import { handleDocsRequest } from './src/api/docsRouter';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const PREFIX = '/mreader';
const DOC_PATH_PREFIX = '/mreader/d/';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith(PREFIX)) {
      return new Response('Not Found', { status: 404 });
    }

    // API routes — checked before asset fallback
    const apiResponse = await handleDocsRequest(request, env);
    if (apiResponse) return apiResponse;

    // SPA rewrite: serve index.html for all /mreader/d/:slug paths
    if (url.pathname.startsWith(DOC_PATH_PREFIX)) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    // Static assets
    const stripped = url.pathname.slice(PREFIX.length) || '/';
    const assetUrl = new URL(request.url);
    assetUrl.pathname = stripped;
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
