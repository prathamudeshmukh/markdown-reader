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
npx vitest run src/hooks/useMarkdownState.test.ts
```

### Pre-commit hooks

Husky runs three checks in parallel on every commit: TypeScript type-check (`tsc`), ESLint, and Vitest. All must pass before the commit lands.

## Architecture

React + Vite + TypeScript frontend with a **Cloudflare Worker backend** deployed at `openmark.cc`. All documents are persisted to Supabase — there is no local-only mode.

The worker entry point is [worker.ts](worker.ts). It routes requests to handler modules, falls back to SPA rewrite for `/d/:slug` paths, and serves static assets via the `ASSETS` binding. A 301 redirect strips the legacy `app.prathamesh.cloud/mreader/*` domain.

### Routing modes

| URL pattern | Behavior |
|-------------|----------|
| `/` | New document — editor mode, in-memory until explicitly saved |
| `/d/:slug` | Saved document — fetched from Supabase, realtime collaboration active |

The slug is extracted from the path by [src/utils/route.ts](src/utils/route.ts). Presence of a slug drives the initial mode (`preview`) and triggers `fetchDoc`. A fork is initiated by writing to `sessionStorage['openmark:fork']` before navigating to `/`.

### Document persistence

All documents are stored in Supabase. The Worker exposes `POST/GET/PUT /api/docs[/:slug]` via [src/api/docsRouter.ts](src/api/docsRouter.ts). The frontend client is [src/api/docsApi.ts](src/api/docsApi.ts).

- **New doc** (no slug): lives in memory until the user hits Save, which POSTs to the Worker and navigates to `/d/:slug`. The response includes a `creatorToken` saved to localStorage via [src/utils/creatorTokens.ts](src/utils/creatorTokens.ts) — this token lets anonymous users edit their own docs without signing in.
- **Saved doc** (slug present): auto-saves on every debounced change (250ms) via `PUT /api/docs/:slug`.

### Access control

`editAccess` is a per-doc flag (stored in Supabase) that controls whether the document is publicly editable. The state hook exposes `isOwner` and `canEdit` derived from `docUserId`, `editAccess`, and the signed-in user. The [src/components/EditAccessToggle.tsx](src/components/EditAccessToggle.tsx) component lets the owner flip this flag.

Authenticated API calls from the frontend attach a JWT via [src/api/authToken.ts](src/api/authToken.ts) (in-memory module, populated by `AuthContext`).

### Realtime collaboration

When a slug is present, [src/realtime/useDocChannel.ts](src/realtime/useDocChannel.ts) subscribes to a Supabase Realtime channel (`doc:<slug>`). It:
- Broadcasts local edits to other connected clients via the `content` event
- Broadcasts comment mutations (`comment:added`, `comment:updated`, `comment:deleted`) so all viewers see live comment changes
- Tracks presence to show a viewer count (`presenceCount`)
- **Silently no-ops when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent** (CI, test environments, local dev without `.env.local`).

### Auth and collections

Supabase email auth is provided by [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx). Authenticated users can organise saved docs into nested collections:

- Types: [src/types/collections.ts](src/types/collections.ts) — `Collection`, `CollectionNode`, `CollectionTree`
- Tree building from flat DB rows: [src/utils/collectionTree.ts](src/utils/collectionTree.ts)
- Worker routes: [src/api/collectionsRouter.ts](src/api/collectionsRouter.ts) + frontend client [src/api/collectionsApi.ts](src/api/collectionsApi.ts)
- State: [src/hooks/useCollections.ts](src/hooks/useCollections.ts) (CRUD + tree refresh)

Collections require the user to be signed in; the sidebar is hidden for unauthenticated sessions.

### Comments

Per-document threaded comments stored in Supabase. Any visitor can post; the doc owner can delete.

- Types: [src/types/comments.ts](src/types/comments.ts)
- Worker routes: [src/api/commentsRouter.ts](src/api/commentsRouter.ts) — `GET/POST /api/docs/:slug/comments`, `PATCH/DELETE /api/docs/:slug/comments/:id`
- Frontend client: [src/api/commentsApi.ts](src/api/commentsApi.ts)
- State hook: [src/hooks/useComments.ts](src/hooks/useComments.ts) — optimistic updates for add/resolve/delete
- Author resolution: if a JWT is present the Worker resolves the display name from Supabase auth; otherwise falls back to the submitted `authorName` or `'Anonymous'`
- Delete requires the caller to be the doc owner (verified via `SUPABASE_SERVICE_ROLE_KEY`)

### AI Beautify

Transforms markdown into a structured visual layout via an AI backend.

- Types: [src/ai/beautifyTypes.ts](src/ai/beautifyTypes.ts) — `BeautifyResult`, `BeautifyNode` union (`hero`, `prose`, `cards`, `callout`, `timeline`, `comparison-table`, `faq`, `stats`, `section-divider`)
- Frontend client: [src/api/beautifyApi.ts](src/api/beautifyApi.ts) — `POST /api/beautify`
- Render components: [src/components/beautify/](src/components/beautify/) — one component per node type

### PDF import

Two code paths gated by the `VITE_USE_PDF_API` feature flag ([src/config/features.ts](src/config/features.ts)):

- **Local** (`usePdfApi = false`): [src/utils/pdfToMarkdown.ts](src/utils/pdfToMarkdown.ts) uses `pdfjs-dist` in-browser with page-by-page progress callbacks.
- **API** (`usePdfApi = true`): [src/utils/pdfApiClient.ts](src/utils/pdfApiClient.ts) POSTs to the Worker. The worker ([src/api/pdfRouter.ts](src/api/pdfRouter.ts)) uploads the PDF to R2, calls an external `PDF2MARKDOWN_API_URL`, then deletes the temp file from R2.

### Telemetry

PostHog integration lives in [src/telemetry/](src/telemetry/). `initTelemetry()` is called in `main.tsx`; `track(eventName, props)` emits typed events. Disabled automatically when `VITE_POSTHOG_KEY` is absent or the browser has Do Not Track set. No markdown content or full URLs are ever sent.

### Key files

| File | Purpose |
|------|---------|
| [worker.ts](worker.ts) | Cloudflare Worker entry — routes to handler modules, SPA rewrite, legacy redirect |
| [src/hooks/useMarkdownState.ts](src/hooks/useMarkdownState.ts) | Central state hook — mode, loading/saving, debounced auto-save, realtime sync, comment callbacks |
| [src/hooks/useComments.ts](src/hooks/useComments.ts) | Comments state with optimistic add/resolve/delete |
| [src/hooks/useCollections.ts](src/hooks/useCollections.ts) | Collections CRUD + tree state |
| [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx) | Supabase email auth context provider |
| [src/api/authToken.ts](src/api/authToken.ts) | In-memory JWT store — populated by AuthContext, consumed by API clients |
| [src/api/docsApi.ts](src/api/docsApi.ts) | Frontend fetch wrappers for the docs API |
| [src/api/collectionsApi.ts](src/api/collectionsApi.ts) | Frontend fetch wrappers for the collections API |
| [src/api/commentsApi.ts](src/api/commentsApi.ts) | Frontend fetch wrappers for the comments API |
| [src/api/beautifyApi.ts](src/api/beautifyApi.ts) | Frontend fetch wrapper for AI beautify |
| [src/api/docsRouter.ts](src/api/docsRouter.ts) | Worker handler for `POST/GET/PUT /api/docs` |
| [src/api/collectionsRouter.ts](src/api/collectionsRouter.ts) | Worker handler for collections CRUD |
| [src/api/commentsRouter.ts](src/api/commentsRouter.ts) | Worker handler for `GET/POST/PATCH/DELETE /api/docs/:slug/comments` |
| [src/api/pdfRouter.ts](src/api/pdfRouter.ts) | Worker handler for PDF → Markdown via R2 + external API |
| [src/api/supabaseClient.ts](src/api/supabaseClient.ts) | Supabase data access (`createDoc`, `getDoc`, `updateDoc`, comments CRUD) |
| [src/api/workerUtils.ts](src/api/workerUtils.ts) | Shared Worker helpers: `json()`, `extractBearerToken()`, `extractUserIdFromJwt()` |
| [src/realtime/useDocChannel.ts](src/realtime/useDocChannel.ts) | Supabase Realtime channel — content + comment broadcast, presence |
| [src/utils/creatorTokens.ts](src/utils/creatorTokens.ts) | localStorage-backed creator tokens for anonymous doc ownership |
| [src/utils/collectionTree.ts](src/utils/collectionTree.ts) | Builds nested tree from flat collections + docs rows |
| [src/utils/route.ts](src/utils/route.ts) | Extracts slug from URL path |
| [src/utils/recentDocs.ts](src/utils/recentDocs.ts) | localStorage-backed recent documents list |
| [src/hooks/useKeyboardShortcuts.ts](src/hooks/useKeyboardShortcuts.ts) | Global keyboard shortcuts (Ctrl+S save, Ctrl+/ toggle mode, Ctrl+Shift+C copy link) |
| [src/config/features.ts](src/config/features.ts) | Feature flags (`VITE_USE_PDF_API`) |
| [src/ai/beautifyTypes.ts](src/ai/beautifyTypes.ts) | TypeScript types for the AI beautify node tree |
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
SUPABASE_SERVICE_ROLE_KEY=...   # required for comment deletion (verifies doc ownership server-side)
PDF2MARKDOWN_API_URL=...        # required when PDF API route is used; external conversion service
# PDF_BUCKET — R2 bucket binding configured in wrangler.toml (not an env var)
```

Missing `VITE_SUPABASE_*` vars → new docs cannot be saved, slug routes 404, realtime disabled.  
Missing `SUPABASE_SERVICE_ROLE_KEY` → Worker refuses to start (validated in `worker.ts`).  
Missing `PDF2MARKDOWN_API_URL` → PDF Worker route fails at conversion step (R2 temp file is still deleted).

### Database migrations

Migrations live in `supabase/migrations/` as `NNN_description.sql`. Every task that adds, removes, or alters a table column must include a new migration file — the task is incomplete without it.

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
| Comment limit reached | `commentsRouter.ts` | 429 `Comment limit reached for this document` |
| Supabase env vars missing | `supabaseRealtimeClient.ts` | Throws; caught in `useDocChannel.ts`; realtime silently disabled |

Worker API responses always follow the envelope: `{ error: string }` on failure, typed payload on success.

### Security

- `rehype-sanitize` strips unsafe HTML in the preview — raw HTML passthrough is intentionally disabled
- Worker enforces **500 KB** content limit for docs and **20 MB** for PDFs; comments are capped at 2 000 chars per comment and 500 comments per doc
- `SUPABASE_SERVICE_ROLE_KEY` is a Worker binding, never exposed to the client; used only for server-side ownership checks
- Creator tokens are 21-character random strings (nanoid) stored in localStorage — they grant edit rights to anonymous users on their own docs
