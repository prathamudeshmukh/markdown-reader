# openmark

A markdown editor and previewer with shareable links, live collaboration, threaded comments, and AI-assisted formatting. Deployed at [openmark.cc](https://openmark.cc).

## Features

- **Write & share** — edit markdown, save it, get a shareable `/d/:slug` link
- **Realtime collaboration** — edits and comments sync live to everyone viewing the same doc
- **Comments** — any visitor can leave threaded comments anchored to a piece of text; the doc owner can resolve or delete them
- **Collections** — signed-in users can organise saved docs into nested folders
- **Access control** — doc owners can toggle whether a document is publicly editable
- **AI Beautify** — transforms markdown into a structured visual layout (hero, cards, timeline, FAQ, stats, etc.)
- **PDF import** — convert a PDF into markdown, either in-browser or via a server-side conversion API
- **Anonymous editing** — new docs get a local creator token so anonymous users can keep editing their own docs without signing in
- **MCP server** — [`@openmark/mcp`](mcp/) lets AI coding agents create, read, and update documents and comments directly ([docs](mcp/README.md))

## Architecture

React + Vite + TypeScript frontend, served together with a **Cloudflare Worker backend** ([worker.ts](worker.ts)) from a single Worker deployment. All documents, comments, and collections are persisted to **Supabase** — there is no local-only mode. Realtime sync uses Supabase Realtime channels; PDF conversion uses an R2 bucket as scratch storage plus an external conversion API.

See [CLAUDE.md](CLAUDE.md) for the full architecture reference (routing modes, persistence model, auth, security, error handling, and key file map).

## Prerequisites

- Node.js 18+
- npm
- A Supabase project (for slug-mode docs, auth, comments, collections, and realtime — see below)

## Setup

```bash
# Install dependencies
npm install

# Start the frontend-only dev server (no Worker routes)
npm run dev

# Or run the full stack (frontend + Cloudflare Worker) via wrangler
npm run wrangler:dev
```

Open [http://localhost:5173](http://localhost:5173) for `npm run dev`, or the wrangler-assigned local URL for `npm run wrangler:dev`.

### Environment variables

**Frontend** — create `.env.local`:

```bash
VITE_SUPABASE_URL=...           # required for slug-mode docs and auth; realtime silently disabled if absent
VITE_SUPABASE_ANON_KEY=...      # required for slug-mode docs and auth; realtime silently disabled if absent
VITE_USE_PDF_API=false          # true → route PDF conversion through the Worker; false → in-browser pdfjs-dist
VITE_POSTHOG_KEY=...            # optional; telemetry disabled if absent or browser has DNT set
VITE_POSTHOG_HOST=...           # optional; required when VITE_POSTHOG_KEY is set
VITE_APP_VERSION=1.0.0          # injected into telemetry events
```

**Worker** — create `.dev.vars` for local dev (set via the Cloudflare dashboard in prod):

```bash
SUPABASE_URL=...                # required for Worker → Supabase data access
SUPABASE_ANON_KEY=...           # required for Worker → Supabase data access
SUPABASE_SERVICE_ROLE_KEY=...   # required — Worker refuses to start without it; used for comment-delete ownership checks
PDF2MARKDOWN_API_URL=...        # required when the PDF API route is used
```

Without `VITE_SUPABASE_*`, new docs can't be saved, slug routes 404, and realtime is disabled. Without `SUPABASE_SERVICE_ROLE_KEY`, the Worker refuses to start.

### Database

Schema lives in `supabase/migrations/` as `NNN_description.sql`. Apply them to your Supabase project in order before running the app.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run wrangler:dev` | Build + run the full stack (frontend + Worker) via wrangler |
| `npm run build` | Type-check + build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Lint TypeScript files |

Run a single test file:

```bash
npx vitest run src/hooks/useMarkdownState.test.ts
```

### Pre-commit hooks

Husky runs TypeScript type-check, ESLint, and Vitest in parallel on every commit. All must pass before the commit lands.

## Tech stack

- React 18 + TypeScript + Vite
- Cloudflare Workers (backend) + R2 (PDF scratch storage)
- Supabase (Postgres + Auth + Realtime)
- Tailwind CSS
- `react-markdown` + `rehype-sanitize` for safe markdown rendering (raw HTML passthrough is disabled)
- `pdfjs-dist` for in-browser PDF parsing
- Vitest + Testing Library

## Telemetry (PostHog)

The app supports lightweight, anonymous funnel telemetry via PostHog Cloud. No markdown content, full URL, or clipboard payload is ever sent.

Set these env vars in `.env.local`:

```bash
VITE_POSTHOG_KEY=phc_your_project_key
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_APP_VERSION=1.0.0
```

Optional for tests:

```bash
VITE_TELEMETRY_ENABLE_IN_TESTS=true
```

Notes:
- Telemetry is disabled when `VITE_POSTHOG_KEY` is missing.
- Telemetry is disabled when browser Do Not Track is enabled.

Quick verification:
1. Start dev server with the env vars above.
2. Open app, save a doc, then copy link or open QR modal.
3. Confirm events in PostHog live events (`app_opened`, `doc_save_succeeded`, `link_copied`, etc.).

## MCP server

[MCP](https://modelcontextprotocol.io) (Model Context Protocol) is an open standard that lets AI coding agents like Claude Code, Claude Desktop, and Cursor call external tools directly — no copy-pasting content between the agent and the app.

[`mcp/`](mcp/) contains `@openmark/mcp`, a standalone npm package that implements an MCP server for openmark. It exposes document and comment operations (create, read, update a doc; list, resolve, delete comments) as MCP tools, so an agent can read and write openmark docs as part of its normal workflow.

### Setup in Claude Code

1. Sign in at [openmark.cc](https://openmark.cc), go to **Settings → API Keys**, and generate a key (starts with `omk_`).
2. Register the server:
   ```bash
   claude mcp add openmark -e OPENMARK_API_KEY=omk_your_key_here -- npx -y @openmark/mcp
   ```
   This writes to `~/.claude.json`.
3. Verify with `claude mcp list`.

See [mcp/README.md](mcp/README.md) for the full tool reference and setup instructions for Claude Desktop and Cursor.
