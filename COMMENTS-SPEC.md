# Comments Feature Spec

## Objective

Allow any visitor of a shared doc to leave text comments anchored to a specific passage they selected in the preview. Any visitor can also resolve comments. The workflow is: a viewer selects text in the preview → posts a comment on that passage → other visitors (including the owner) can read and resolve it once addressed.

**Target users**: Anyone with a saved doc link — authenticated or anonymous.  
**Anchor scope**: Preview mode only. Comments are attached to a verbatim text selection captured at post time.

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | **Desktop** — in preview mode on a saved doc, selecting text shows a floating "Add comment" button near the selection |
| 2 | **Mobile** — long-pressing anywhere in the preview opens the CommentForm bottom sheet pre-filled with the nearest paragraph text as the anchor |
| 3 | The CommentForm has: optional display-name field (placeholder "Anonymous"), required comment textarea, Submit button |
| 4 | Submitting stores the comment with the verbatim anchor text; the form closes |
| 5 | All anchored passages are highlighted (yellow tint) in the preview |
| 6 | **Desktop** — clicking/hovering a highlight shows a floating tooltip listing all comments on that passage |
| 7 | **Mobile** — tapping a highlight opens a bottom sheet listing all comments on that passage |
| 8 | The Comments panel (toggled from the Header overflow menu) lists all comments; default tab is "Open" (unresolved) |
| 9 | Resolve / Unresolve and Delete actions are always visible in the panel (never hover-gated) |
| 10 | **Any** visitor (auth or anon) can mark any comment as resolved or unresolved |
| 11 | Comments are only available on saved docs (`slug` present); the Comments entry is hidden otherwise |
| 12 | The Comments entry shows an unresolved-count badge (hidden at 0) |
| 13 | New comments and resolved-state changes appear in real-time for all connected visitors |
| 14 | If a comment's anchor text is no longer present in the doc, the comment stays in the panel with the quoted snippet shown as a blockquote — no highlight in the preview |
| 15 | Doc owner (and only the doc owner) can delete any comment |
| 16 | Comment content and anchor text are never sent in telemetry |

---

## Data Model

### Migration: `007_add_comments.sql`

```sql
create table if not exists comments (
  id          uuid        primary key default gen_random_uuid(),
  doc_slug    text        not null references docs(slug) on delete cascade,
  user_id     uuid        references auth.users(id) on delete set null,
  author_name text        not null default 'Anonymous'
                          check (char_length(author_name) between 1 and 100),
  content     text        not null
                          check (char_length(content) between 1 and 2000),
  anchor_text text        check (anchor_text is null or char_length(anchor_text) between 1 and 500),
  resolved    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index comments_doc_slug_idx on comments (doc_slug, created_at asc);

alter table comments enable row level security;

-- Anyone (anon or auth) can read all comments
create policy "anyone can read comments"
  on comments for select
  using (true);

-- Anyone (anon or auth) can insert
-- anon role gets user_id = null; auth role supplies auth.uid()
create policy "anyone can insert comments"
  on comments for insert
  with check (true);

-- Anyone can update resolved flag only
-- (RLS cannot restrict which columns are updated — enforce this in the Worker)
create policy "anyone can update comments"
  on comments for update
  using (true)
  with check (true);

-- Only the doc owner (authenticated) can delete any comment
-- non-owners and anon cannot delete
create policy "doc owner can delete comments"
  on comments for delete to authenticated
  using (
    exists (
      select 1 from docs
      where docs.slug = comments.doc_slug
        and docs.user_id = auth.uid()
    )
  );
```

> **`anchor_text`**: The verbatim string the commenter had selected in the preview. Nullable — a null anchor means a document-level comment (no highlight). Max 500 chars; truncate client-side if the selection exceeds that.
>
> **`author_name`**: Pre-filled from the authenticated user's display name / email prefix; for anon users it is what they typed, or `'Anonymous'` if left blank.
>
> **No `resolved_by` / `resolved_at`**: Keeping resolve simple — just a boolean. Any visitor can flip it; detailed audit trail is out of scope.

---

## TypeScript Types

**`src/types/comments.ts`** (new file)

```typescript
export interface Comment {
  id: string;
  docSlug: string;
  userId: string | null;
  authorName: string;
  content: string;
  anchorText: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  content: string;
  authorName: string;       // '' → Worker stores 'Anonymous'
  anchorText: string | null;
}

export interface ResolveCommentInput {
  resolved: boolean;
}
```

---

## API

New router added to the Cloudflare Worker at `src/api/commentsRouter.ts`.

| Method   | Path                               | Auth required | Who |
|----------|------------------------------------|---------------|-----|
| `GET`    | `/api/docs/:slug/comments`         | No            | Anyone |
| `POST`   | `/api/docs/:slug/comments`         | No            | Anyone |
| `PATCH`  | `/api/docs/:slug/comments/:id`     | No            | Anyone (resolve only) |
| `DELETE` | `/api/docs/:slug/comments/:id`     | Yes (JWT)     | Doc owner only |

**Limits**:
- `content`: 1–2000 chars (400 after trimming blank body)
- `anchor_text`: 1–500 chars (trimmed; null allowed)
- `author_name`: 1–100 chars (trimmed; empty → `'Anonymous'`)
- 500 comments per doc → `429 { error: 'Comment limit reached for this document' }`

**Request / response shapes**:

```
GET /api/docs/:slug/comments
→ 200 { comments: Comment[] }    ordered by created_at asc
→ 404 if doc slug unknown

POST /api/docs/:slug/comments
← { content: string; authorName?: string; anchorText?: string | null }
→ 201 { comment: Comment }
→ 400 if content missing, empty, or > 2000 chars
→ 404 if doc not found
→ 429 if limit exceeded

PATCH /api/docs/:slug/comments/:id
← { resolved: boolean }          only this field is writable via PATCH
→ 200 { comment: Comment }
→ 400 if resolved is not a boolean
→ 404 if comment not found

DELETE /api/docs/:slug/comments/:id
→ 204
→ 401 if no JWT
→ 403 if caller is not the doc owner
→ 404 if comment not found
```

**`author_name` resolution in `handlePost`**: if the request has a Bearer JWT, extract the `sub` and call `GET /auth/v1/user` with that JWT to read `user_metadata.full_name` or fall back to the email prefix. If `authorName` was supplied in the request body, use that instead (allows signed-in users to override). Store `user_id` from the JWT when present.

**PATCH is restricted to `resolved` only** — enforced in the Worker handler (not in RLS), returning `400` if any other field is present.

---

## Supabase Client

Add to **`src/api/supabaseClient.ts`**:

```typescript
export interface CommentRow {
  id: string;
  doc_slug: string;
  user_id: string | null;
  author_name: string;
  content: string;
  anchor_text: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

// Uses service role key — bypasses RLS so all comments are visible
export async function getComments(env: SupabaseEnv, docSlug: string): Promise<CommentRow[]>

// Uses anon key for insert — anon RLS policy allows it
export async function createComment(env: SupabaseEnv, fields: {
  docSlug: string;
  userId: string | null;
  authorName: string;
  content: string;
  anchorText: string | null;
}): Promise<CommentRow>

// Uses anon key for update — anon RLS policy allows it
export async function resolveComment(env: SupabaseEnv, id: string, resolved: boolean): Promise<CommentRow>

// Uses user JWT — only doc-owner RLS policy allows delete
export async function deleteComment(env: SupabaseEnv, id: string, userJwt: string): Promise<void>
```

---

## Frontend Components

### `src/api/commentsApi.ts` (new file)

Fetch wrappers matching the four Worker endpoints, following the same envelope pattern as `docsApi.ts`.

```typescript
export async function fetchComments(slug: string): Promise<Comment[]>
export async function postComment(slug: string, input: CreateCommentInput): Promise<Comment>
export async function resolveComment(slug: string, id: string, resolved: boolean): Promise<Comment>
export async function deleteComment(slug: string, id: string, jwt: string): Promise<void>
```

### `src/hooks/useComments.ts` (new file)

```typescript
interface UseCommentsResult {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  addComment: (input: CreateCommentInput) => Promise<void>;
  toggleResolve: (id: string, resolved: boolean) => Promise<void>;
  removeComment: (id: string, jwt: string) => Promise<void>;
  unresolvedCount: number;
}

export function useComments(slug: string | null): UseCommentsResult
```

- Fetches all comments on mount when `slug` is non-null.
- Subscribes to `doc:<slug>` Supabase Realtime channel for `comment_added`, `comment_updated`, `comment_deleted` events.
- Optimistic local update on add / resolve / delete; rolls back on error with `state.error` set.
- `unresolvedCount` is `comments.filter(c => !c.resolved).length` (derived, not stored).

---

## Text Selection & Highlight Flow

### Desktop — capturing a selection

1. Attach a `mouseup` listener to the preview container.
2. Read `window.getSelection()`:
   - If empty, collapsed, or outside the preview container → do nothing.
   - Otherwise: capture `selection.toString().trim()`, truncated to 500 chars.
3. Show a floating `<AddCommentButton>` positioned just above the selection's `getBoundingClientRect()`. Clamp to viewport edges so it never goes off-screen.
4. Clicking `<AddCommentButton>` opens `<CommentForm>` as a popover (≥640px screens) with `anchorText` pre-set. The text selection is preserved until the form is dismissed or submitted.
5. Pressing Escape or clicking outside dismisses the button; the selection is cleared.

### Mobile — long-press to comment

Text selection on mobile conflicts with the browser's native selection toolbar (iOS copy/define bar, Android context menu). A floating button cannot reliably coexist with it. The mobile path avoids text selection entirely:

1. Attach a `touchstart` listener to the preview container. Start a 500 ms timer; store the touch coordinates.
2. On `touchmove` (>10px movement) or `touchend` before the timer fires → cancel the timer (normal scroll / tap).
3. When the 500 ms timer fires (confirmed long-press):
   - Call `preventDefault()` to suppress the native context menu.
   - Use `document.elementFromPoint(x, y)` at the stored coordinates to find the touched node.
   - Walk up the DOM to the nearest block ancestor (`p`, `h1`–`h6`, `li`, `blockquote`, `td`) and take its `textContent`, trimmed and truncated to 500 chars, as `anchorText`.
   - Open `<CommentForm>` as a bottom sheet with `anchorText` pre-filled.
4. If no suitable block element is found, open `<CommentForm>` with `anchorText: null` (document-level comment).

> **Note**: `touch-action: pan-y` must remain on the preview container so normal scrolling is unaffected until the 500 ms threshold is crossed.

### Highlighting anchored comments in the preview

After the preview renders and the comments list is available:

1. Collect all comments with a non-null `anchor_text`. Unresolved comments get a yellow (`--comment-highlight`) tint; resolved comments get a lighter grey tint and are only highlighted when the "Resolved" tab is active.
2. Use a DOM text-search utility (recommend [`mark.js`](https://markjs.io/)) to find all occurrences of each `anchor_text` string in the preview container's text nodes.
3. Wrap each match in `<mark data-comment-ids="id1,id2" class="comment-anchor">`. A single `<mark>` carries multiple IDs when anchors overlap.
4. Re-run inside a `useEffect` that depends on `comments` and the rendered preview HTML. Clean up all `<mark>` wrappers before re-running to prevent nesting.

### Opening comments from a highlight

Attach a single delegated `click` / `tap` listener on the preview container. When the event target is (or is inside) a `.comment-anchor` element:
- **Desktop** (pointer device detected via `matchMedia('(pointer: fine)')`): render a `<CommentTooltip>` floating near the element.
- **Mobile** (coarse pointer or touch): open a `<CommentBottomSheet>` instead.

Both surfaces show the same content: the list of comments for that anchor, each with a Resolve/Unresolve button and (for the doc owner) a Delete button.

### Stale anchors

When a comment's `anchor_text` is not found in the current rendered preview, it receives no highlight. In the Comments panel the comment displays with the quoted `anchor_text` as a styled blockquote (grey, italic, prefixed with a `"` glyph) so the original passage is still readable.

---

## UI Components

### `src/components/AddCommentButton.tsx` (new file, desktop only)

A floating pill button that appears near the active text selection. Positioned with `position: fixed` using the selection's `getBoundingClientRect()`, clamped to viewport edges. Not rendered on touch/coarse-pointer devices — the long-press flow replaces it there.

### `src/components/CommentForm.tsx` (new file)

Fields:
- `Your name` (text input, optional, max 100 chars, placeholder "Anonymous")
- `Comment` (textarea, required, max 2000 chars, character counter shown when > 1800)
- If `anchorText` is set: a read-only preview of the anchor passage (grey blockquote, truncated to 120 chars with ellipsis) shown above the textarea so the user sees what they are commenting on
- Submit button (disabled while textarea is empty or while submitting)

**Presentation**:
- **Desktop (≥640px, fine pointer)**: popover anchored near the `<AddCommentButton>` or the selection rect.
- **Mobile (< 640px or coarse pointer)**: bottom sheet that slides up from the bottom of the screen; the sheet height is `auto` up to 80vh; the textarea is the first focused element so the keyboard opens immediately.

### `src/components/CommentsPanel.tsx` (new file)

**Desktop**: slide-in drawer on the right side (~360px wide), pushes the preview content inward on screens ≥1440px, overlays it on smaller screens.  
**Mobile**: full-screen overlay (100vw × 100vh) with a drag handle at the top; swiping down closes it.

Structure:
1. **Header**: "Comments" title + unresolved badge + close button (× on desktop, chevron-down on mobile)
2. **Filter tabs**: "Open" | "Resolved" — default "Open"
3. **Comment list**: `<CommentItem>` per visible comment (filtered by tab); scrollable
4. **Empty state**: "No open comments" / "No resolved comments"

### `src/components/CommentItem.tsx` (new file)

- Author name + relative timestamp (e.g. "2h ago")
- If `anchor_text` is set and not found in the current doc: grey blockquote showing the original passage
- Comment body (plain text, never rendered as markdown)
- **Action row — always visible** (never hover-gated; use a subtle muted style):
  - Everyone: Resolve / Unresolve button
  - Doc owner only: Delete button (destructive red tint)
- Minimum tap target: 44 × 44 px on each action button (follow iOS HIG / WCAG 2.5.5)

### `src/components/CommentTooltip.tsx` (new file, desktop only)

Compact floating tooltip shown on clicking a `<mark>` on fine-pointer (desktop) devices. Lists all comments attached to that anchor, each with Resolve / Unresolve and (for the doc owner) Delete. Max height 320px with internal scroll. Dismissed by clicking outside or pressing Escape.

### `src/components/CommentBottomSheet.tsx` (new file, mobile only)

Full-width bottom sheet shown when tapping a `<mark>` on coarse-pointer (mobile/tablet) devices. Same content as `CommentTooltip`. Closes by tapping the drag handle, swiping down, or tapping the overlay backdrop.

---

## Integration Points

### `src/components/Header.tsx`

Add a **Comments entry** to both the desktop right-side controls group and the mobile overflow `...` menu.

- Hidden (not rendered) when `slug === null`
- Shows an unresolved count badge (hidden at 0); badge sits as a superscript on the icon/label
- New prop on `HeaderActions`: `onToggleComments: () => void`
- New fields on `UiState`: `commentsPanelOpen: boolean; unresolvedCommentCount: number`

### `src/App.tsx`

- Instantiate `useComments(slug)` alongside `useMarkdownState`.
- Pass `commentsPanelOpen`, `unresolvedCommentCount`, and `onToggleComments` into `Header`.
- Render `<CommentsPanel>` when `commentsPanelOpen && slug !== null`.
- Render `<AddCommentButton>` (desktop only, via `matchMedia('(pointer: fine)')`) when in preview mode, a slug is present, and a selection is active.
- Render `<CommentTooltip>` (desktop) or `<CommentBottomSheet>` (mobile) when a `<mark>` is clicked.
- The Comments panel sits beside the preview on very wide screens (≥1440px); overlays it otherwise.

### `src/components/Preview.tsx`

- Accept an `onSelectionChange: (text: string | null) => void` callback prop.
- Attach `mouseup` / `touchend` handler that fires `onSelectionChange` with the trimmed selection text (or `null` when the selection is cleared).
- Accept a `comments: Comment[]` prop and run the highlight pass inside a `useEffect`.
- Expose a `previewRef` (forwarded ref or internal) that the highlight utility needs to scope its search.

---

## Realtime Integration

Extend `useDocChannel.ts` with three new broadcast event types:

```typescript
| 'comment_added'   → onCommentAdded(comment: Comment)
| 'comment_updated' → onCommentUpdated(comment: Comment)
| 'comment_deleted' → onCommentDeleted(id: string)
```

The Worker broadcasts after every successful comment write (fire-and-forget using the Supabase REST broadcast endpoint with the service role key):
- `POST` → `comment_added`
- `PATCH` → `comment_updated`
- `DELETE` → `comment_deleted`

`useDocChannel` options interface gains:

```typescript
onCommentAdded?:   (comment: Comment) => void;
onCommentUpdated?: (comment: Comment) => void;
onCommentDeleted?: (id: string) => void;
```

All three are optional so callers that don't use comments remain unaffected.

---

## Telemetry

Add to `src/telemetry/types.ts`:

```typescript
| 'comment_panel_opened'
| 'comment_posted'
| 'comment_resolved'
| 'comment_deleted'
```

Props:

```typescript
comment_panel_opened: { unresolved_count: number };
comment_posted:       { has_anchor: boolean };
comment_resolved:     { resolved: boolean };
comment_deleted:      Record<string, never>;
```

No comment content, anchor text, or author names in any event.

---

## Testing Strategy

### Unit tests (new files)

| File | What to cover |
|------|---------------|
| `commentsRouter.test.ts` | POST validates content length; POST stores 'Anonymous' when authorName blank; PATCH rejects non-`resolved` fields; DELETE returns 403 for non-owner; 429 when limit hit |
| `commentsApi.test.ts` | Each wrapper serialises / deserialises Comment correctly |
| `useComments.test.ts` | `unresolvedCount` derived correctly; optimistic update applied before fetch resolves; rollback on error |
| `CommentForm.test.tsx` | Submit disabled when content empty; character counter at 1800 chars; name field accepts empty value |
| `CommentItem.test.tsx` | Resolve/Unresolve button always shown; Delete button shown only for doc owner |
| `CommentTooltip.test.tsx` | Renders all comments for the clicked anchor; Escape key dismisses it; not rendered on coarse-pointer |
| `CommentBottomSheet.test.tsx` | Renders all comments; closes on backdrop tap and swipe-down gesture |
| `Preview.test.tsx` (extend) | `onSelectionChange` fires with trimmed text on mouseup; fires null when selection cleared; long-press (500ms touchstart) triggers `onLongPress` with nearest block text; short tap or scroll cancels timer |

### Integration tests

- `POST → GET` round-trip: posted comment appears in subsequent fetch
- `PATCH` persists `resolved: true`; second `PATCH` with `resolved: false` inverts it
- `DELETE` by non-doc-owner → 403
- Anon `POST` (no JWT) → 201 with `authorName: 'Anonymous'`

### Manual / visual

**Desktop**:
- Select text in preview → `AddCommentButton` appears → form opens as popover with anchor pre-filled → submit → text highlighted → comment in panel
- Click highlight → `CommentTooltip` floats nearby with Resolve/Delete actions
- Resolve from tooltip → highlight fades; comment moves to "Resolved" tab

**Mobile**:
- Long-press on a paragraph (≥500ms, no scroll) → `CommentForm` bottom sheet slides up with nearest paragraph pre-filled as anchor
- Short tap or scroll → no form opens
- Tap a highlighted passage → `CommentBottomSheet` slides up listing comments for that anchor
- Open panel from `...` overflow menu → all comments listed, actions always visible (not hover-gated)

**Both**:
- Edit doc content to remove the anchored text → comment in panel shows grey blockquote, no highlight in preview

### Coverage target: 80%+ on all new files.

---

## Boundaries

### Always do
- Validate `content` at both client and Worker (1–2000 chars)
- Store `anchor_text` verbatim; never re-interpret it as markdown
- Return `{ error: string }` envelope on all Worker errors
- Cascade-delete all comments when a doc is deleted (FK `on delete cascade`)
- Run the highlight pass in a `useEffect` to avoid blocking the render
- Keep all action buttons (Resolve, Delete) always visible — never hidden behind hover state
- Minimum 44×44 px tap target on all interactive elements in the panel and bottom sheet
- Detect pointer type via `matchMedia('(pointer: fine)')` to choose tooltip vs. bottom sheet; do not rely on user-agent sniffing

### Ask before doing
- Allowing a commenter to delete their own comment (currently only doc owner can delete)
- Showing how many comments are on a highlight before opening the tooltip (e.g., `+3` badge on the `<mark>`)
- Email / push notifications on new comment
- Reply threading (comments on comments)
- Comment editing after submission
- Highlighting in editor mode (requires mapping preview selection back to markdown offsets)

### Never do
- Render `content` or `anchor_text` as markdown/HTML — always plain text (XSS prevention)
- Include comment content or anchor text in any telemetry event
- Cache comments at the Cloudflare edge (freshness comes from Realtime)
- Allow `PATCH` to update any field other than `resolved`

---

## File Inventory

| Action  | Path |
|---------|------|
| New     | `supabase/migrations/007_add_comments.sql` |
| New     | `src/types/comments.ts` |
| New     | `src/api/commentsApi.ts` |
| New     | `src/api/commentsRouter.ts` |
| New     | `src/hooks/useComments.ts` |
| New     | `src/components/AddCommentButton.tsx` — desktop floating button |
| New     | `src/components/CommentForm.tsx` — popover (desktop) / bottom sheet (mobile) |
| New     | `src/components/CommentsPanel.tsx` — drawer (desktop) / full-screen overlay (mobile) |
| New     | `src/components/CommentItem.tsx` — single comment row with always-visible actions |
| New     | `src/components/CommentTooltip.tsx` — desktop floating tooltip on highlight click |
| New     | `src/components/CommentBottomSheet.tsx` — mobile bottom sheet on highlight tap |
| Modify  | `src/api/supabaseClient.ts` — add comment CRUD functions |
| Modify  | `src/realtime/useDocChannel.ts` — add three comment broadcast handlers |
| Modify  | `src/components/Header.tsx` — Comments button + `onToggleComments` prop |
| Modify  | `src/components/Preview.tsx` — selection callback + highlight pass |
| Modify  | `src/App.tsx` — wire `useComments`, render panel + floating button |
| Modify  | `src/telemetry/types.ts` — four new event types |
| Modify  | `src/worker.ts` — register commentsRouter |
