# Spec: Viewer Journey (Shared Doc Experience)

## Objective

Redesign the experience for anyone who opens a `/d/:slug` link without being the document owner. Currently, viewers land in a full editor UI they cannot meaningfully use. The goal is a clean, purposeful reading experience that:

- Feels like opening a published document, not someone else's draft
- Defaults to the richest available view (Beautify > Preview)
- Strips all editing chrome that is irrelevant to a reader
- Shows light attribution to signal who created the doc and nudge the viewer toward the product

**Owner** = anyone with the creator token for this slug in `localStorage` (existing mechanism).  
**Viewer** = everyone else, including signed-in users who didn't create the doc.  
Same URL (`/d/:slug`) for both — the app adapts the UI based on token presence.

---

## User Journey

### Viewer (no creator token)

1. Viewer opens `/d/:slug` from a shared link
2. App fetches the doc; detects no creator token → **viewer mode**
3. **If a saved beautify result exists**: lands in Beautify view
4. **Otherwise**: lands in clean Preview (markdown rendered)
5. If both Preview and a beautify result exist, a slim mode toggle (Preview | Beautify) is visible — no Editor tab
6. A slim top attribution bar replaces the right-side header actions:
   - If doc was saved by a signed-in user: "Created by `<owner_display_name>`"
   - Otherwise: Openmark branding only
7. Formatting toolbar and bottom action bar are hidden entirely
8. Doc title is rendered as plain text, not an editable input

### Owner (creator token present)

- Full editor experience unchanged — Editor / Preview / Beautify tabs, formatting toolbar, bottom action bar, editable title

---

## Acceptance Criteria

### AC-1: Viewer mode detection
- On load of a slug route, check `localStorage` for the creator token
- If token absent → set `isViewer = true`; token present → `isViewer = false` (owner)
- `isViewer` is derived once on mount; does not change during the session

### AC-2: Default view for viewers
- If `beautify_result` is present in the fetched doc → default mode is `'beautify'`
- If no `beautify_result` → default mode is `'preview'`
- Owner default mode remains `'preview'` regardless (existing behaviour, per SPEC_BEAUTIFY_PERSIST.md)

### AC-3: Mode toggle for viewers
- Viewer sees a mode toggle only when both `preview` and `beautify` are available
- Toggle shows exactly two options: **Preview** and **Beautify**
- **Editor** tab is never shown to viewers
- If only one mode is available (no beautify result), no toggle is shown at all — just the content

### AC-4: Chrome removal for viewers
- **Formatting toolbar**: hidden entirely (`isViewer === true` → toolbar not rendered)
- **Bottom action bar**: hidden entirely for viewers
- **Doc title**: rendered as a `<h1>` (or styled `<div>`) — not an `<input>`. Non-editable.
- **Right-side header actions** (Copy link, QR, PDF export, etc.): hidden for viewers

### AC-5: Attribution bar
- A slim bar rendered inside the simplified header (not a separate DOM section)
- Content logic:
  - `owner_display_name` present on the doc → show "Created by `<name>`"
  - `owner_display_name` absent → show Openmark wordmark / branding only
- The bar does **not** include a CTA button (no "Create your own" link in this version)
- Bar is always visible for viewers; hidden for owners

### AC-6: Owner display name storage
- When a **signed-in** user saves a new doc (`POST /api/docs`), store their email or display name in a new `owner_display_name` column on the `docs` table
- Anonymous saves leave `owner_display_name` as `NULL`
- `GET /api/docs/:slug` returns `owner_display_name` (nullable) in the response
- Owners cannot edit this field through the app

### AC-7: Viewer cannot trigger AI run
- Re-run AI button is hidden for viewers (as already specified in SPEC_BEAUTIFY_PERSIST.md AC-5)
- Beautify mode toggle tab is only shown if a saved `beautify_result` exists — viewers cannot initiate a fresh run

---

## Data Model

### Supabase `docs` table — new column

| Column | Type | Notes |
|---|---|---|
| `owner_display_name` | `text` | Display name or email of the creating signed-in user — nullable |

Combined with columns from SPEC_BEAUTIFY_PERSIST.md:
| `beautify_result` | `jsonb` | Full `BeautifyResult` — nullable |
| `beautify_content_hash` | `text` | djb2 hash at run time — nullable |

### API changes

**`POST /api/docs`** — Worker reads `user.email` (or display name) from the authenticated Supabase context and writes it to `owner_display_name` if the user is signed in; leaves `NULL` for anonymous creates.

**`GET /api/docs/:slug`** — response extends to include:
```json
{
  "content": "...",
  "title": "...",
  "owner_display_name": "prathamesh@example.com",
  "beautify_result": { ... },
  "beautify_content_hash": "abc123"
}
```

---

## Architecture

### New / changed files

| File | Change |
|---|---|
| `src/hooks/useMarkdownState.ts` | Derive and export `isViewer: boolean` (creator token absent on slug route); pass `isViewer` to consumers |
| `src/App.tsx` | Pass `isViewer` to Header, FormattingToolbar, BottomActionBar, BeautifyView; conditionally render toolbar and bottom bar |
| `src/components/Header.tsx` | In viewer mode: hide right-side actions, show attribution bar, remove Editor tab from mode toggle |
| `src/components/FormattingToolbar.tsx` | Accept `isViewer` prop; render `null` when true |
| `src/components/DocTitle.tsx` (or equivalent) | Render plain text instead of `<input>` when `isViewer === true` |
| `src/components/BottomActionBar.tsx` | Accept `isViewer` prop; render `null` when true |
| `src/components/ViewerAttributionBar.tsx` | New component: slim bar with "Created by `<name>`" or Openmark branding |
| `src/api/supabaseClient.ts` | Add `owner_display_name` to `createDoc` input and `getDoc` return |
| `src/api/docsRouter.ts` | Read owner identity from Supabase auth context on POST; pass through on GET |

### `isViewer` derivation

```typescript
// Inside useMarkdownState — derived once on mount
const isViewer = slug !== null && loadCreatorToken(slug) === null;
```

No state — pure computation. Owners who clear their localStorage become viewers on next load (acceptable edge case; matches current token-based auth model).

---

## Code Style

- `isViewer` is a derived boolean, not stored in state — compute from token check at hook initialisation
- `ViewerAttributionBar` is a new presentational component — no hooks, pure props
- Viewer-specific rendering is gated with `isViewer` props passed down, not inferred from context — keeps components testable in isolation
- No new dependencies

---

## Testing Strategy

### Unit tests
- `useMarkdownState`: `isViewer = true` when slug present and no creator token; `false` when token exists
- `useMarkdownState`: default mode is `'beautify'` when `isViewer && beautify_result` present; `'preview'` otherwise

### Component tests
- `Header`: Editor tab absent when `isViewer=true`; mode toggle hidden when no beautify result; attribution bar visible
- `FormattingToolbar`: renders `null` when `isViewer=true`
- `BottomActionBar`: renders `null` when `isViewer=true`
- `ViewerAttributionBar`: shows owner name when provided; shows fallback branding when `null`
- `DocTitle` (or equivalent): renders `<input>` for owner; plain text for viewer

### Integration tests
- `docsRouter.ts` POST: `owner_display_name` written when Supabase auth user present; `NULL` when anonymous
- `docsRouter.ts` GET: `owner_display_name` returned in response

Coverage target: 80%+ on all changed files.

---

## Boundaries

| Always | Ask first | Never |
|---|---|---|
| Use creator token as the owner signal | Switching to user_id-based ownership | Show the Editor tab to viewers |
| Default to Beautify if AI result exists | Adding "Create your own doc" CTA button | Let viewers trigger a new AI run |
| Strip formatting toolbar and bottom bar for viewers | Adding viewer analytics (e.g. view count) | Store viewer identity or track who reads a doc |
| Show attribution bar in header | Changing the URL shape for viewers vs owners | Change owner default mode (remains Preview) |
| Derive `isViewer` once at mount | Letting viewers save a copy of the doc | Require sign-in to view a shared doc |

---

## Relationship to SPEC_BEAUTIFY_PERSIST.md

These two specs share the `beautify_result` / `beautify_content_hash` columns and the "viewers see AI result read-only" rule. Build order: **SPEC_BEAUTIFY_PERSIST first** (adds the columns and persist logic), then **this spec** (consumes `beautify_result` for viewer default mode and attribution bar).
