# Markdown Reader — Feature Roadmap 2

## Remaining from Roadmap 1 (Not Yet Implemented)

### Split View (Side-by-Side)
- Show editor and preview simultaneously on wider screens
- Layout toggle: `editor | split | preview`
- Files: `src/App.tsx`, `src/components/Header.tsx`

### Drag & Drop / Paste `.md` Files
- Allow dragging a `.md` file onto the editor to open it
- Also handle paste events for file content
- Files: `src/components/Editor.tsx`

### Word Count & Reading Time
- Display live stats: word count, character count, estimated read time
- Show in footer or header when in preview mode
- Files: New `src/utils/stats.ts`, `src/App.tsx` or `src/components/Preview.tsx`

### Table of Contents
- Auto-generate a TOC from headings (`##`, `###`) in the document
- Collapsible panel or sidebar
- Files: New `src/components/TableOfContents.tsx`, `src/App.tsx`

### Version History
- Store snapshots when document is updated (with timestamps)
- Allow viewing/restoring previous versions
- DB schema change required (`versions` table)
- Files: `supabaseClient.ts`, `docsRouter.ts`, new `src/components/VersionHistory.tsx`

### Document Templates
- Start from pre-built templates: Meeting Notes, README, Blog Post, etc.
- Show template picker on empty new doc
- Files: New `src/utils/templates.ts`, new `src/components/TemplatePicker.tsx`

### Find & Replace
- Search within editor content
- Keyboard shortcut `Ctrl+F`
- Files: `src/components/Editor.tsx`

### Read-Only Share Mode
- Option to share a document as view-only (no editing)
- URL param or separate route `/mreader/v/{slug}`
- Files: `src/hooks/useMarkdownState.ts`, routing logic

### Embed Support
- Generate an `<iframe>` embed code for the preview
- Useful for embedding rendered docs in other pages
- Files: `src/components/Header.tsx`

---

## High Impact, Low Effort

### Markdown Toolbar
- Fixed toolbar above editor with formatting buttons: **Bold**, *Italic*, `Code`, [Link], Image, > Quote, `---` Rule
- Wraps selected text or inserts at cursor position
- Files: new `src/components/Toolbar.tsx`, `src/components/Editor.tsx`

### Mermaid Diagram Support
- Render fenced code blocks labeled `mermaid` as diagrams (flowcharts, sequence diagrams, ERDs)
- Use `rehype-mermaid` or runtime `mermaid.js`
- Files: `src/components/Preview.tsx`

### Math / LaTeX Rendering
- Render `$inline$` and `$$block$$` math expressions via KaTeX
- Use `rehype-katex` + `remark-math`
- Files: `src/components/Preview.tsx`

### Document Statistics Footer
- Live word count, character count, paragraph count, estimated read time
- Subtle footer bar visible in both editor and preview modes
- Files: new `src/utils/stats.ts`, new `src/components/StatsBar.tsx`

### Focus / Zen Mode
- Hide header, collapse stats — expand editor/preview to full viewport
- Toggle with `Cmd+Shift+F` or a dedicated button
- Files: `src/App.tsx`, `src/hooks/useMarkdownState.ts`

---

## High Impact, Medium Effort

### Image Upload & Hosting
- Paste or drag images directly into the editor
- Upload to Supabase Storage and insert markdown image syntax automatically
- Files: `src/components/Editor.tsx`, new `src/api/imageUpload.ts`

### Custom Preview Themes
- Multiple CSS themes for rendered preview: GitHub, Dracula, Notion-style, Solarized, etc.
- Stored in localStorage, applied via a class on the prose container
- Files: new `src/utils/themes.ts`, `src/components/Preview.tsx`, `src/components/Header.tsx`

### Presentation / Slideshow Mode
- Split content on `---` separators and render as a full-screen slideshow
- Navigate slides with arrow keys; similar to Marp / reveal.js but lightweight
- Files: new `src/components/SlideShow.tsx`, new `src/hooks/useSlides.ts`

### QR Code Share
- Generate a QR code for the current document URL
- Show in a popup modal — useful for sharing to mobile devices
- Files: new `src/components/QRModal.tsx` (use `qrcode` npm package)

### Document Diff View
- Compare current content with a saved snapshot
- Side-by-side or inline diff highlighting
- Requires version history feature as dependency
- Files: new `src/components/DiffView.tsx` (use `diff` npm package)

### Export as HTML
- Download the rendered markdown as a standalone HTML file with embedded styles
- Client-side only via `blob` + `URL.createObjectURL`
- Files: `src/components/Header.tsx`, new `src/utils/exportHtml.ts`

---

## Nice to Have

### Auto-pair Brackets & Quotes
- Auto-close `(`, `[`, `{`, `"`, `` ` `` when typing in the editor
- Standard code-editor UX improvement
- Files: `src/components/Editor.tsx`

### Link Preview on Hover
- Hover over a link in preview mode to see a tooltip with the URL + favicon
- Files: `src/components/Preview.tsx`

### Multiple Documents / Tabs
- Open multiple docs simultaneously with a tab bar UI
- State per-tab stored in sessionStorage or URL
- Requires architectural decision

### GitHub Gist Import/Export
- Import content from a public Gist URL
- Export current doc as a new Gist (requires GitHub OAuth)
- Files: new `src/utils/gistApi.ts`

### Emoji Shortcodes
- Render `:emoji_name:` shortcodes in preview (e.g. `:tada:` → 🎉)
- Use `remark-gemoji` plugin
- Files: `src/components/Preview.tsx`

### Vanity / Custom Slugs
- Allow renaming a document slug to something memorable
- Requires backend uniqueness validation
- Files: `src/api/docsRouter.ts`, `src/components/Header.tsx`

---

## Prioritization

| Priority | Feature | Reason |
|----------|---------|--------|
| 1 | Markdown Toolbar | Lowers barrier for non-markdown users |
| 2 | Document Stats Footer | Quick win, high visibility |
| 3 | Mermaid Diagrams | Developer appeal, common request |
| 4 | Focus / Zen Mode | Low effort, great writing experience |
| 5 | Custom Preview Themes | Visual polish, personalization |
| 6 | Image Upload | Removes major content limitation |
| 7 | Math / LaTeX | Appeals to academic and technical users |
| 8 | Export as HTML | Useful companion to existing PDF export |
| 9 | Presentation Mode | Unique differentiator |
| 10 | QR Code Share | Convenience feature |
