# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

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
npx vitest run src/hooks/useMarkdownState.test.ts
```

### Pre-commit hooks

Husky runs three checks in parallel on every commit: TypeScript type-check (`tsc`), ESLint, and Vitest. All must pass before the commit lands.

## Architecture

React + Vite + TypeScript frontend with a **Cloudflare Worker backend**. All documents are persisted to Supabase — there is no local-only hash mode.

### Routing modes

| URL pattern | Behavior |
|-------------|----------|
| `/mreader/` | New document — editor mode, in-memory until explicitly saved |
| `/mreader/d/:slug` | Saved document — fetched from Supabase, realtime collaboration active |

The slug is extracted from the path by [src/utils/route.ts](src/utils/route.ts). Presence of a slug drives the initial mode (`preview`) and triggers `fetchDoc`.

### Document persistence

All documents are stored in Supabase. The Cloudflare Worker exposes `POST/GET/PUT /mreader/api/docs[/:slug]` via [src/api/docsRouter.ts](src/api/docsRouter.ts). The frontend client is [src/api/docsApi.ts](src/api/docsApi.ts).

- **New doc** (no slug): lives in memory until the user hits Save, which POSTs to the Worker and navigates to `/mreader/d/:slug`.
- **Saved doc** (slug present): auto-saves on every debounced change (250ms) via `PUT /mreader/api/docs/:slug`.

### Realtime collaboration

When a slug is present, [src/realtime/useDocChannel.ts](src/realtime/useDocChannel.ts) subscribes to a Supabase Realtime channel (`doc:<slug>`). It:
- Broadcasts local edits to other connected clients via the `content` event
- Tracks presence to show a viewer count (`presenceCount`)
- **Silently no-ops when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent** (CI, test environments, local dev without `.env.local`). The app remains fully functional — documents just aren't collaborative.

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
| [src/realtime/useDocChannel.ts](src/realtime/useDocChannel.ts) | Supabase Realtime channel for live collaboration |
| [src/realtime/supabaseRealtimeClient.ts](src/realtime/supabaseRealtimeClient.ts) | Singleton Supabase client for realtime (throws if env vars missing) |
| [src/utils/collectionTree.ts](src/utils/collectionTree.ts) | Builds nested tree from flat collections + docs rows |
| [src/utils/route.ts](src/utils/route.ts) | Extracts slug from URL path |
| [src/utils/recentDocs.ts](src/utils/recentDocs.ts) | localStorage-backed recent documents list (not synced; collections are server-synced) |
| [src/hooks/useKeyboardShortcuts.ts](src/hooks/useKeyboardShortcuts.ts) | Global keyboard shortcuts (Ctrl+S save, Ctrl+/ toggle mode, Ctrl+Shift+C copy link) |
| [src/config/features.ts](src/config/features.ts) | Feature flags (e.g. `VITE_USE_PDF_API`) |
| [src/telemetry/](src/telemetry/) | PostHog analytics — typed event catalogue in `types.ts` |
| [src/App.tsx](src/App.tsx) | Composes state hook + components, renders banner messages |

### Environment variables

**Frontend** (`.env.local`):
```bash
VITE_SUPABASE_URL=...           # required for slug-mode docs and auth; realtime silently disabled if absent
VITE_SUPABASE_ANON_KEY=...      # required for slug-mode docs and auth; realtime silently disabled if absent
VITE_USE_PDF_API=false          # true → route PDF conversion through Worker; false → in-browser pdfjs-dist
VITE_POSTHOG_KEY=...            # optional; telemetry disabled if absent or browser has DNT set
VITE_POSTHOG_HOST=...           # optional; required when VITE_POSTHOG_KEY is set
VITE_APP_VERSION=1.0.0          # injected into telemetry events
```

**Worker** (`.dev.vars` for local dev, Cloudflare dashboard for prod):
```bash
SUPABASE_URL=...                # required for Worker → Supabase data access
SUPABASE_ANON_KEY=...           # required for Worker → Supabase data access
PDF2MARKDOWN_API_URL=...        # required when PDF API route is used; external conversion service
# PDF_BUCKET — R2 bucket binding configured in wrangler.toml (not an env var)
```

Missing `VITE_SUPABASE_*` vars → new docs cannot be saved, slug routes 404, realtime disabled.  
Missing `PDF2MARKDOWN_API_URL` → PDF Worker route will fail at conversion step (R2 upload still occurs, then temp file is deleted).

### Error handling

| Failure | Where caught | User-visible effect |
|---------|-------------|---------------------|
| `fetchDoc` network/HTTP error | `useMarkdownState.ts` `.catch` | `state.error` set; banner shown, `isLoading` cleared |
| Auto-save (`updateDoc`) failure | `useMarkdownState.ts` `.catch` | `state.error` set; `isSaving` cleared |
| Initial save (`saveDoc`) failure | `useMarkdownState.ts` `try/catch` | `state.error` set; `doc_save_failed` telemetry event emitted |
| PDF multipart parse error | `pdfRouter.ts` | 400 `Invalid multipart form data` |
| PDF too large (>20 MB) | `pdfRouter.ts` | 413 `PDF file exceeds the 20 MB limit` |
| R2 upload failure | `pdfRouter.ts` | 500 `Failed to store PDF for conversion` |
| External PDF conversion failure | `pdfRouter.ts` | 422 or 500 with descriptive message; R2 temp file deleted in `finally` |
| Supabase env vars missing | `supabaseRealtimeClient.ts` | Throws; caught in `useDocChannel.ts`; realtime silently disabled |

Worker API responses always follow the envelope: `{ error: string }` on failure, typed payload on success.

### Security

- `rehype-sanitize` strips unsafe HTML in the preview — raw HTML passthrough is intentionally disabled
- Worker enforces **500 KB** content limit for docs and **20 MB** for PDFs
- Supabase credentials and R2/PDF env vars are Worker bindings, never exposed to the client
- Decoded URL content is treated as untrusted input
