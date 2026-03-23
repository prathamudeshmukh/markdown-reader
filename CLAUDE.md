# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Type-check + build for production
npm run preview    # Preview production build
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run lint       # Lint TypeScript files
```

Run a single test file:
```bash
npx vitest run src/utils/encoding.test.ts
```

## Architecture

React + Vite + TypeScript frontend with a **Cloudflare Worker backend**. Documents can be shared via two mechanisms: URL-hash encoding (no backend, local only) or server-persisted slugs (Supabase).

### Routing modes

| URL pattern | Behavior |
|-------------|----------|
| `/mreader/` | New document — editor mode, hash-based state |
| `/mreader/d/:slug` | Shared document — fetched from Supabase, realtime collaboration active |

The slug is extracted from the path by [src/utils/route.ts](src/utils/route.ts). Presence of a slug drives the initial mode (`preview`) and triggers `fetchDoc`.

### Document persistence

- **Hash mode** (no slug): URL hash stores Base64 URL-safe encoded markdown. `history.replaceState` updates it on every debounced change (250ms). Logic lives in [src/utils/encoding.ts](src/utils/encoding.ts) and [src/utils/url.ts](src/utils/url.ts).
- **Slug mode**: Documents are stored in Supabase. The Cloudflare Worker exposes `POST/GET/PUT /mreader/api/docs[/:slug]` via [src/api/docsRouter.ts](src/api/docsRouter.ts). The frontend client is [src/api/docsApi.ts](src/api/docsApi.ts). Saving a new doc navigates to `/mreader/d/:slug`.

### Realtime collaboration

When a slug is present, [src/realtime/useDocChannel.ts](src/realtime/useDocChannel.ts) subscribes to a Supabase Realtime channel (`doc:<slug>`). It:
- Broadcasts local edits to other connected clients via the `content` event
- Tracks presence to show a viewer count (`presenceCount`)
- Silently no-ops when Supabase env vars are missing (CI/test environments)

### PDF import

Two code paths gated by the `VITE_USE_PDF_API` feature flag ([src/config/features.ts](src/config/features.ts)):

- **Local** (`usePdfApi = false`): [src/utils/pdfToMarkdown.ts](src/utils/pdfToMarkdown.ts) uses `pdfjs-dist` in-browser with page-by-page progress callbacks.
- **API** (`usePdfApi = true`): [src/utils/pdfApiClient.ts](src/utils/pdfApiClient.ts) POSTs to the Cloudflare Worker. The worker ([src/api/pdfRouter.ts](src/api/pdfRouter.ts)) uploads the PDF to R2, calls an external `PDF2MARKDOWN_API_URL`, then deletes the temp file from R2.

### Key files

| File | Purpose |
|------|---------|
| [src/hooks/useMarkdownState.ts](src/hooks/useMarkdownState.ts) | Central state hook — owns mode, loading/saving state, debounced auto-save, realtime sync |
| [src/api/docsApi.ts](src/api/docsApi.ts) | Frontend fetch wrappers for the docs API |
| [src/api/docsRouter.ts](src/api/docsRouter.ts) | Cloudflare Worker handler for `POST/GET/PUT /mreader/api/docs` |
| [src/api/pdfRouter.ts](src/api/pdfRouter.ts) | Cloudflare Worker handler for PDF → Markdown conversion via R2 + external API |
| [src/api/supabaseClient.ts](src/api/supabaseClient.ts) | Supabase data access (`createDoc`, `getDoc`, `updateDoc`) |
| [src/realtime/supabaseRealtimeClient.ts](src/realtime/supabaseRealtimeClient.ts) | Singleton Supabase client for realtime (throws if env vars missing) |
| [src/telemetry/](src/telemetry/) | Analytics: `track(eventName, props)` — typed event catalogue in `types.ts` |
| [src/utils/recentDocs.ts](src/utils/recentDocs.ts) | localStorage-backed recent documents list |
| [src/hooks/useKeyboardShortcuts.ts](src/hooks/useKeyboardShortcuts.ts) | Global keyboard shortcuts (save, toggle mode, copy link) |

### Security

- `rehype-sanitize` strips unsafe HTML in the preview — raw HTML passthrough is intentionally disabled
- Worker enforces 500 KB content limit for docs and 20 MB for PDFs
- Supabase credentials and R2/PDF env vars are Worker bindings, never exposed to the client
