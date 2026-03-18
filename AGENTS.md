# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

This is a **frontend-only** React + Vite + TypeScript app. The entire document state lives in the URL hash — no backend, no localStorage.

### URL strategy
- Hash fragment stores Base64 URL-safe encoded markdown: `/#<encoded>`
- On load: hash present → preview mode with decoded content; no hash → empty editor mode
- On every editor change (debounced 250ms): `history.replaceState` updates the hash without polluting browser history
- Empty content → hash removed entirely for a clean URL

### Key files

| File | Purpose |
|------|---------|
| [src/utils/encoding.ts](src/utils/encoding.ts) | Unicode-safe, URL-safe Base64 encode/decode (`TextEncoder`/`TextDecoder` + `btoa`/`atob`). All encoding logic lives here. |
| [src/utils/url.ts](src/utils/url.ts) | `readHash()` / `writeHash()` — thin wrappers around `window.location.hash` and `history.replaceState` |
| [src/hooks/useMarkdownState.ts](src/hooks/useMarkdownState.ts) | Central state hook: initializes from URL on mount, manages `markdownText`, `mode`, `decodeError`, `isContentLarge`. Owns the debounce timer. |
| [src/components/Header.tsx](src/components/Header.tsx) | App title + "Show Preview"/"Show Editor" toggle + "Copy Link" button |
| [src/components/Editor.tsx](src/components/Editor.tsx) | Controlled `<textarea>` for markdown input |
| [src/components/Preview.tsx](src/components/Preview.tsx) | `react-markdown` + `rehype-sanitize` renders markdown safely |
| [src/App.tsx](src/App.tsx) | Composes state hook + components, renders banner messages for decode errors and oversized content |

### Encoding details
- `+` → `-`, `/` → `_`, trailing `=` stripped (URL-safe alphabet)
- Invalid Base64 in the hash → caught, app falls back to empty editor with a warning banner
- Content warning shown when encoded bytes exceed ~8 KB (practical URL length risk)

### Security
- `rehype-sanitize` strips unsafe HTML from rendered markdown — raw HTML passthrough is intentionally disabled
- Decoded URL content is treated as untrusted input
