# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server (http://localhost:5173)
npm run wrangler:dev    # Build + Cloudflare Worker dev server
npm run build           # Type-check + Vite build for production
npm run preview         # Preview production build
npm run test            # Run tests in watch mode
npm run test:run        # Run tests once
npm run lint            # Lint TypeScript files
```

Run a single test file:
```bash
npx vitest run src/utils/encoding.test.ts
```

### Pre-commit hooks

Husky runs three checks in parallel on every commit: TypeScript type-check (`tsc`), ESLint, and Vitest. All must pass before the commit lands.

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

### Auth and collections

Supabase email auth is provided by [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx). Authenticated users can organise saved docs into nested collections:

- Types: [src/types/collections.ts](src/types/collections.ts) — `Collection`, `CollectionNode`, `CollectionTree`
- Tree building from flat DB rows: [src/utils/collectionTree.ts](src/utils/collectionTree.ts)
- Worker routes: [src/api/collectionsRouter.ts](src/api/collectionsRouter.ts) + frontend client [src/api/collectionsApi.ts](src/api/collectionsApi.ts)
- State: [src/hooks/useCollections.ts](src/hooks/useCollections.ts) (CRUD + tree refresh)

Collections require the user to be signed in; the sidebar is hidden for unauthenticated sessions.

### PDF import

Two code paths gated by the `VITE_USE_PDF_API` feature flag ([src/config/features.ts](src/config/features.ts)):

- **Local** (`usePdfApi = false`): [src/utils/pdfToMarkdown.ts](src/utils/pdfToMarkdown.ts) uses `pdfjs-dist` in-browser with page-by-page progress callbacks.
- **API** (`usePdfApi = true`): [src/utils/pdfApiClient.ts](src/utils/pdfApiClient.ts) POSTs to the Cloudflare Worker. The worker ([src/api/pdfRouter.ts](src/api/pdfRouter.ts)) uploads the PDF to R2, calls an external `PDF2MARKDOWN_API_URL`, then deletes the temp file from R2.

### Telemetry

PostHog integration lives in [src/telemetry/](src/telemetry/). `initTelemetry()` is called in `main.tsx`; `track(eventName, props)` emits typed events. Disabled automatically when `VITE_POSTHOG_KEY` is absent or the browser has Do Not Track set. No markdown content or full URLs are ever sent.

### Key files

| File | Purpose |
|------|---------|
| [src/hooks/useMarkdownState.ts](src/hooks/useMarkdownState.ts) | Central state hook — owns mode, loading/saving state, debounced auto-save, realtime sync |
| [src/hooks/useCollections.ts](src/hooks/useCollections.ts) | Collections CRUD + tree state |
| [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx) | Supabase email auth context provider |
| [src/api/docsApi.ts](src/api/docsApi.ts) | Frontend fetch wrappers for the docs API |
| [src/api/collectionsApi.ts](src/api/collectionsApi.ts) | Frontend fetch wrappers for the collections API |
| [src/api/docsRouter.ts](src/api/docsRouter.ts) | Cloudflare Worker handler for `POST/GET/PUT /mreader/api/docs` |
| [src/api/collectionsRouter.ts](src/api/collectionsRouter.ts) | Cloudflare Worker handler for collections CRUD |
| [src/api/pdfRouter.ts](src/api/pdfRouter.ts) | Cloudflare Worker handler for PDF → Markdown conversion via R2 + external API |
| [src/api/supabaseClient.ts](src/api/supabaseClient.ts) | Supabase data access (`createDoc`, `getDoc`, `updateDoc`) |
| [src/realtime/supabaseRealtimeClient.ts](src/realtime/supabaseRealtimeClient.ts) | Singleton Supabase client for realtime (throws if env vars missing) |
| [src/utils/collectionTree.ts](src/utils/collectionTree.ts) | Builds nested tree from flat collections + docs rows |
| [src/telemetry/](src/telemetry/) | PostHog analytics — typed event catalogue in `types.ts` |
| [src/utils/recentDocs.ts](src/utils/recentDocs.ts) | localStorage-backed recent documents list (not synced; collections are server-synced) |
| [src/hooks/useKeyboardShortcuts.ts](src/hooks/useKeyboardShortcuts.ts) | Global keyboard shortcuts (Ctrl+S save, Ctrl+/ toggle mode, Ctrl+Shift+C copy link) |

### Environment variables

**Frontend** (`.env.local`):
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_USE_PDF_API=false          # true to route PDF conversion through Worker
VITE_POSTHOG_KEY=...            # optional; telemetry disabled if absent
VITE_POSTHOG_HOST=...
VITE_APP_VERSION=1.0.0
```

**Worker** (`.dev.vars` for local dev, Cloudflare dashboard for prod):
```bash
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
PDF2MARKDOWN_API_URL=...        # external conversion service
# PDF_BUCKET R2 binding configured in wrangler.toml
```

### Security

- `rehype-sanitize` strips unsafe HTML in the preview — raw HTML passthrough is intentionally disabled
- Worker enforces 500 KB content limit for docs and 20 MB for PDFs
- Supabase credentials and R2/PDF env vars are Worker bindings, never exposed to the client
