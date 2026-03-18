# Markdown Reader

A frontend-only markdown editor and previewer. Write markdown in the editor, get a shareable link — no backend, no sign-up required.

## How it works

The entire document is stored in the URL hash as Base64-encoded markdown. Share the URL to share your document.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run wrangler:dev` | Full stack server start |
| `npm run build` | Type-check + build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Lint TypeScript files |

Run a single test file:

```bash
npx vitest run src/utils/encoding.test.ts
```

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- `react-markdown` + `rehype-sanitize` for safe markdown rendering
- Vitest + Testing Library

## Telemetry (PostHog)

The app supports lightweight, anonymous funnel telemetry via PostHog Cloud.

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
- No markdown content, full URL, or clipboard payload is sent.

Quick verification:
1. Start dev server with the env vars above.
2. Open app, save a doc, then copy link or open QR modal.
3. Confirm events in PostHog live events (`app_opened`, `doc_save_succeeded`, `link_copied`, etc.).
