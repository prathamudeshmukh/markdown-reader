interface Env {
  ASSETS: Fetcher;
}

const PREFIX = '/mreader';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith(PREFIX)) {
      return new Response('Not Found', { status: 404 });
    }

    const stripped = url.pathname.slice(PREFIX.length) || '/';
    const assetUrl = new URL(request.url);
    assetUrl.pathname = stripped;

    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
