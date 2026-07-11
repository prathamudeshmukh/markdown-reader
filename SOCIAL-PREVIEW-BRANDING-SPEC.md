# Spec: OG Image Branding

## Objective

The per-doc OG image (`/api/og/:slug.png`, shipped by [SOCIAL-PREVIEW-SPEC.md](SOCIAL-PREVIEW-SPEC.md)) currently renders as flat white bold text on a plain dark rectangle ([ogImageRouter.ts:34-39](src/api/ogImageRouter.ts#L34-L39)) — nothing on the card identifies it as an Openmark document. This makes the card forgettable in a crowded Slack/Twitter/iMessage feed and wastes a high-visibility surface for brand recognition.

This feature redesigns the card to be visibly Openmark-branded and more visually interesting, while keeping the title as the hero content: anyone who has seen one shared Openmark link should recognize the next one at a glance, even before reading the title.

**Target users:** anyone who shares or receives a `/d/:slug` link (unchanged from the parent feature).

**Success looks like:** the generated card shows the Openmark logo mark + wordmark, a branded gradient background (not flat), a domain footer, and the doc title — all within the existing 1200×630 dimensions and Workers CPU/caching constraints.

## Assumptions

Chosen direction (confirmed): **Branded gradient hero** — full radial gradient background, logo badge + "openmark" wordmark pinned top-left, title as the dominant element, "openmark.cc" footer bottom-right.

Other assumptions I'm proceeding with:

1. **The gradient is new, not reused.** There's no existing homepage gradient in this codebase to match (checked `src/index.css`, `src/App.tsx` — flat colors only, no `gradient` usage anywhere). I'll compose a new radial gradient from the app's own dark-mode tokens (`--bg-primary: #0d0d0d`, `--accent: #6366f1`/`#818cf8` from [src/index.css:28-42](src/index.css#L28-L42)) rather than inventing unrelated colors.
2. **Logo mark is redrawn with CSS, not an embedded image.** [public/logo.svg](public/logo.svg) is a rounded dark badge with a 4-bar gradient "#" glyph. Rather than fetching/base64-embedding the SVG/PNG asset into the Worker (extra `ASSETS.fetch` + encoding step), I'll reproduce the same badge with flex `<div>`s and the same gradient stops (`#c7d2fe` → `#6366f1`) directly in the template — simpler, no new asset-loading path, pixel-equivalent to the real logo.
3. **No new font weight.** The only bundled font is `Inter-Bold.woff` (700) at [public/fonts/Inter-Bold.woff](public/fonts/Inter-Bold.woff). Wordmark, title, and footer all use weight 700, differentiated by size/color instead of weight — avoids adding a second font file.
4. **Title truncation/sizing may need retuning.** The left-aligned hero layout leaves less usable width/height for the title than the old fully-centered layout. `OG_IMAGE_TITLE_MAX_LENGTH` (100) and the 64px font size are starting points, not fixed — they'll be checked against a real long-title render during implementation and adjusted if the text overflows or wraps awkwardly.
5. **No changes to caching, routing, or the redirect-on-missing-doc fallback.** This is a template/visual change only, confined to how the HTML string is built.

→ Correct me now or I'll proceed with these.

## Tech Stack

Unchanged from the parent feature — no new dependencies:
- `workers-og` (already installed, `^0.0.27`) — Satori-based renderer, supports CSS gradients and flex layouts in the HTML-like input
- Existing bundled font: `public/fonts/Inter-Bold.woff`
- Existing Cache API pattern (`cfCache()`, `docCacheKeys.ts`) — untouched

## Commands

```bash
npm run test:run                                          # full suite
npx vitest run src/api/ogImageTemplate.test.ts             # new template unit tests
npx vitest run src/api/ogImageRouter.test.ts               # existing router tests, updated assertions
npm run wrangler:dev                                       # manual visual check at /api/og/:slug.png
npm run lint && npm run build
```

## Project Structure

New:
```
src/api/ogImageTemplate.ts        # buildOgImageHtml(title: string): string — pure, no Request/Env
src/api/ogImageTemplate.test.ts   # unit tests for the template markup
```

Modified:
```
src/api/ogImageRouter.ts          # buildOgImageHtml moves out to ogImageTemplate.ts; router imports it
src/api/ogImageRouter.test.ts     # assertions updated for the new markup (wordmark, footer text still present)
```

No changes to `worker.ts`, `docCacheKeys.ts`, `docMeta.ts`, `supabaseClient.ts`, or any migration — this is a rendering-only change.

## Code Style

Card composition (1200×630, all values as named constants in `ogImageTemplate.ts`, not inline literals):

```
┌──────────────────────────────────────────────┐
│ [▤] openmark                                  │  ← logo badge (56px) + wordmark, top-left
│                                                │
│                                                │
│   My Document Title Goes Here                 │  ← left-aligned, vertically centered, 700 Inter, white
│                                                │
│                                                │
│                                    openmark.cc │  ← muted indigo footer, bottom-right
└──────────────────────────────────────────────┘
  background: radial-gradient(circle at 30% 20%, #1e1b4b 0%, #0d0d0d 65%)
  logo badge: 56×56, rounded, bg #111111, 4-bar "#" glyph, gradient #c7d2fe → #6366f1
  wordmark: 'Inter' 700, 28px, color #c7d2fe
  title: 'Inter' 700, 64px, color #ffffff
  footer: 'Inter' 700, 22px, color #818cf8
```

Example of the extracted, pure template function:

```typescript
// src/api/ogImageTemplate.ts
export function buildOgImageHtml(title: string): string {
  const safeTitle = escapeHtmlAttr(truncateForImage(title));
  return `<div style="display: flex; flex-direction: column; justify-content: space-between; height: 100vh; width: 100vw; background: ${OG_IMAGE_GRADIENT}; padding: ${OG_IMAGE_PADDING}px;">
  ${renderBrandRow()}
  <h1 style="font-family: '${OG_IMAGE_FONT_NAME}'; font-weight: 700; font-size: ${OG_IMAGE_TITLE_SIZE}px; color: white; margin: 0; line-height: 1.15;">${safeTitle}</h1>
  ${renderFooterRow()}
</div>`;
}
```

- Same escaping boundary as today — `escapeHtmlAttr` called once, on the title, before it's written into the template.
- `renderBrandRow()` / `renderFooterRow()` are small private helpers in the same file (not exported) — keeps `buildOgImageHtml` readable without over-splitting into more files than this warrants.
- All colors, sizes, and copy (`"openmark"`, `"openmark.cc"`) become named constants at the top of `ogImageTemplate.ts` — no magic strings/numbers in the template literal.

## Testing Strategy

### Unit — `ogImageTemplate.test.ts` (new)
| Scenario | Assertion |
|---|---|
| Any title | Output contains the wordmark text `openmark` and footer text `openmark.cc` |
| Any title | Output contains the gradient background declaration (not the old flat `#0f172a`) |
| Title with `< > & " '` | Escaped in output, same as today |
| Overly long title | Still truncated with `…`, doesn't appear in full (regression of existing behavior) |
| Title text | Appears exactly once as the `<h1>` content, distinct from wordmark/footer strings |

### Updated — `ogImageRouter.test.ts`
- Existing tests keep passing unchanged in behavior (routing, caching, redirect-on-missing-doc) — only the HTML-content assertions need to still find the title text, which they already do via `expect.stringContaining('My Doc')`.

### Manual (not automatable — visual/rendering correctness)
- `npm run wrangler:dev`, fetch `/api/og/:slug.png` for: a short title, a very long title, a title with special characters — confirm no overflow/clipping, gradient renders, badge glyph looks right, footer doesn't collide with title.
- Compare rendered badge against `public/logo.svg` side-by-side for visual consistency.
- Re-run one real social-debugger check (as in the parent feature) to confirm the new image still displays correctly end-to-end.

Coverage target: ≥80% on new/modified files, consistent with repo-wide bar.

## Boundaries

### Always do
- Keep `buildOgImageHtml` a pure function (string in, string out) — no `Request`/`Env`, no I/O — so it's unit-testable without mocking the Workers runtime.
- Escape the title exactly once, at the same boundary as today.
- Verify a real long-title render manually before calling this done — the reduced title area is the main risk in this change.

### Ask first before doing
- Adding any new font file/weight (e.g. a lighter weight for the footer) — out of scope for this pass; flag if the single bold weight looks wrong in practice rather than silently adding a dependency.
- Fetching/embedding the actual `logo.svg`/`logo.png` asset instead of the CSS-redrawn badge — bigger change (asset loading, base64 encoding, extra fetch on the render path); only do this if the CSS redraw turns out not to look right.

### Never do
- Change caching behavior, cache keys, or the missing-doc redirect fallback — out of scope.
- Introduce a second escaping pass or move escaping to a different layer.

## Success Criteria

- [ ] `/api/og/:slug.png` shows a radial gradient background, logo badge, "openmark" wordmark, the doc title, and "openmark.cc" footer
- [ ] Long titles still truncate cleanly without overflowing the new, smaller title area
- [ ] `< > & " '` in a title remain properly escaped
- [ ] All new/updated unit tests pass; `ogImageRouter.test.ts` suite stays green
- [ ] `npm run lint`, `npm run build`, `npm run test:run` pass
- [ ] Manually verified via `wrangler:dev` for short/long/special-character titles

## Open Questions

None blocking — the one retuning risk (title max length / font size for the new layout) is called out under Assumptions #4 and resolved empirically during implementation, not upfront.
