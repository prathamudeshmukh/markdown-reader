# Markdown Reader — Feature Roadmap

## High Impact, Low Effort

### 1. Syntax Highlighting in Code Blocks
- Add `rehype-highlight` or `rehype-prism` to the preview pipeline
- Significant quality-of-life improvement for developers
- Files: `src/components/Preview.tsx`

### 2. Split View (Side-by-Side)
- Show editor and preview simultaneously on wider screens
- Layout toggle: `editor | split | preview`
- Files: `src/App.tsx`, `src/components/Header.tsx`

### 3. Drag & Drop / Paste `.md` Files
- Allow dragging a `.md` file onto the editor to open it
- Also handle paste events for file content
- Files: `src/components/Editor.tsx`

### 4. Export / Download
- Download current document as `.md` file
- Optional: export as HTML or PDF (via browser print)
- Files: `src/components/Header.tsx` (add button)

### 5. Keyboard Shortcuts
- `Ctrl+S` / `Cmd+S` → save
- `Ctrl+P` / `Cmd+P` → toggle preview
- `Ctrl+Shift+C` → copy link
- Files: `src/hooks/useMarkdownState.ts`, `src/App.tsx`

---

## High Impact, Medium Effort

### 6. Document Title
- Let users name documents instead of just showing the slug
- Store title in DB alongside content
- Show in `<title>`, header, and recent docs list
- Files: DB schema, `docsRouter.ts`, `supabaseClient.ts`, `Header.tsx`, `recentDocs.ts`

### 7. Word Count & Reading Time
- Display live stats: word count, character count, estimated read time
- Show in footer or header when in preview mode
- Files: New `src/utils/stats.ts`, `src/App.tsx` or `src/components/Preview.tsx`

### 8. Table of Contents
- Auto-generate a TOC from headings (`##`, `###`) in the document
- Collapsible panel or sidebar
- Files: New `src/components/TableOfContents.tsx`, `src/App.tsx`

### 9. Version History
- Store snapshots when document is updated (with timestamps)
- Allow viewing/restoring previous versions
- DB schema change required (`versions` table)
- Files: `supabaseClient.ts`, `docsRouter.ts`, new `src/components/VersionHistory.tsx`

---

## Nice to Have

### 10. Dark/Light Mode Toggle
- Currently always follows system preference via Tailwind's dark mode class
- Add manual toggle with localStorage persistence
- Files: `src/App.tsx`, `src/components/Header.tsx`

### 11. Document Templates
- Start from pre-built templates: Meeting Notes, README, Blog Post, etc.
- Show template picker on empty new doc
- Files: New `src/utils/templates.ts`, new `src/components/TemplatePicker.tsx`

### 12. Find & Replace
- Search within editor content
- Keyboard shortcut `Ctrl+F`
- Files: `src/components/Editor.tsx` (may need CodeMirror or similar)

### 13. Read-Only Share Mode
- Option to share a document as view-only (no editing)
- URL param or separate route `/mreader/v/{slug}`
- Files: `src/hooks/useMarkdownState.ts`, routing logic

### 14. Embed Support
- Generate an `<iframe>` embed code for the preview
- Useful for embedding rendered docs in other pages
- Files: `src/components/Header.tsx`
