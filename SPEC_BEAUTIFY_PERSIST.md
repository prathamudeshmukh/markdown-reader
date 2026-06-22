# Spec: Persist AI Beautify Result

## Objective

Allow the AI beautified view to be persisted per-document in Supabase so that:
- Re-entering Beautify mode for a saved doc is instant (no re-run needed)
- Collaborators and public viewers can see the AI view without an API key
- The stale state is surfaced clearly when markdown has changed since the last run

Target users: signed-in doc owners who use the AI Beautify feature.

---

## User Journey

1. User opens a saved doc (`/d/:slug`)
2. User switches to Beautify mode — AI runs, result renders
3. **Result auto-saves to Supabase** alongside the markdown (no extra action)
4. User edits the markdown → doc auto-saves (existing behaviour)
5. User re-enters Beautify mode → stale banner appears ("Content changed — re-run AI") with the old result still visible underneath
6. User clicks Re-run → new AI result saves, banner disappears
7. A public visitor opens the share link → Beautify tab is visible; they see the saved result (read-only, no Re-run button)

---

## Acceptance Criteria

### AC-1: Auto-save on successful AI run
- When `useBeautify.trigger()` or `useBeautify.rerun()` resolves successfully, the result is persisted via `PUT /api/docs/:slug` (or a new dedicated endpoint)
- The saved payload includes: `beautify_result` (the full `BeautifyResult` JSON) and `beautify_content_hash` (djb2 hash of the markdown at run time)
- Saving is fire-and-forget; failures do not block the UI (logged but silent)

### AC-2: Load saved result on doc open
- `GET /api/docs/:slug` returns `beautify_result` and `beautify_content_hash` alongside the existing `content` field
- `useMarkdownState` passes these to `useBeautify` on init
- If `beautify_result` is present, `useBeautify` starts in `status: 'success'` (no AI call made)

### AC-3: Staleness detection
- On load (and after every markdown edit), compare `djb2(currentMarkdown)` with the stored `beautify_content_hash`
- If they differ, `useBeautify` exposes `isStale: true`
- `BeautifyView` renders the old result with a dismissible stale banner on top

### AC-4: Stale banner
- Banner text: "Content has changed since the last AI run."
- Primary action: "Re-run AI" button (calls `rerun()`)
- The old result remains fully visible under the banner — no blank state

### AC-5: Public viewers
- The AI tab/button is visible to unauthenticated visitors on slug routes if `beautify_result` is stored
- Unauthenticated viewers see the saved result but get no Re-run button (Re-run requires `user !== null`)
- No AI API key exposure: the stored JSON is served directly, no Claude API call on read

### AC-6: New docs (no slug)
- Beautify still works in-memory (existing behaviour)
- Auto-save only triggers when a slug exists
- The first Save (which creates the slug) does NOT save the beautify result; the result saves only when the AI runs

---

## Data Model

### Supabase `docs` table — new columns

| Column | Type | Notes |
|---|---|---|
| `beautify_result` | `jsonb` | Full `BeautifyResult` — nullable |
| `beautify_content_hash` | `text` | djb2 hash of content at run time — nullable |

Both columns default to `NULL`. No migration for existing rows needed.

### API changes

**`GET /api/docs/:slug`** — response extends to include:
```json
{
  "content": "...",
  "title": "...",
  "beautify_result": { "theme": "...", "accent": "...", "nodes": [...] },
  "beautify_content_hash": "abc123"
}
```

**`PUT /api/docs/:slug`** — request body extends to optionally include:
```json
{
  "beautify_result": { ... },
  "beautify_content_hash": "abc123"
}
```
The docs Worker passes these through to Supabase `updateDoc` if present; ignores them if absent (partial update).

---

## Architecture

### New / changed files

| File | Change |
|---|---|
| `src/api/supabaseClient.ts` | Add `beautify_result` / `beautify_content_hash` to `getDoc` return and `updateDoc` input |
| `src/api/docsApi.ts` | Add optional `beautify_result` + `beautify_content_hash` to `updateDoc` payload |
| `src/api/docsRouter.ts` | Pass new fields through on PUT |
| `src/hooks/useBeautify.ts` | Accept `initialResult?` + `initialHash?` props; expose `isStale: boolean`; call `saveBeautifyResult()` after successful run |
| `src/hooks/useMarkdownState.ts` | Pass `beautify_result`/`beautify_content_hash` from fetched doc into `useBeautify` |
| `src/components/BeautifyView.tsx` | Render stale banner when `isStale === true`; hide Re-run button for unauthenticated viewers |

### Hook signature change (`useBeautify`)

```typescript
interface UseBeautifyOptions {
  initialResult?: BeautifyResult;
  initialHash?: string;
  onSave?: (result: BeautifyResult, hash: string) => void;
}

interface UseBeautifyReturn {
  result: BeautifyResult | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isStale: boolean;
  error: string | null;
  trigger: () => void;
  rerun: () => void;
}
```

`isStale` is `true` when `initialHash` is present AND `djb2(currentMarkdown) !== initialHash`.

---

## Code Style

- Follow existing patterns: `docsApi.ts` for fetch wrappers, `supabaseClient.ts` for DB access
- `onSave` is fire-and-forget — errors are caught and logged, never rethrown
- `isStale` is derived (computed in render from hash comparison), not stored in state
- No new dependencies

---

## Testing Strategy

### Unit tests
- `useBeautify`: test `isStale` is false when hashes match, true when they differ, false when no `initialHash`
- `useBeautify`: test `onSave` is called with result + hash after successful trigger/rerun
- `useBeautify`: test `onSave` is NOT called when slug is absent (no-op guard)
- `supabaseClient.ts`: test `updateDoc` passes `beautify_result` when provided, omits it when absent

### Integration tests
- `docsRouter.ts`: `PUT` with `beautify_result` persists through; `GET` returns it
- `docsRouter.ts`: `PUT` without `beautify_result` does not overwrite existing value

### Component tests
- `BeautifyView`: stale banner renders when `isStale=true`, hidden when `isStale=false`
- `BeautifyView`: Re-run button absent when `user=null`

Coverage target: 80%+ on all changed files.

---

## Boundaries

| Always | Ask first | Never |
|---|---|---|
| Auto-save result after every successful AI run (when slug exists) | Adding a manual "Save AI result" button (not in this spec) | Expose `ANTHROPIC_API_KEY` in any GET response |
| Show old result under stale banner | Making beautify the default mode on load | Block markdown auto-save when beautify save is in-flight |
| Serve stored result to public viewers | Versioning/history of beautify results | Auto-run AI on doc open |
| Guard Re-run behind `user !== null` | Charging separately for storing beautify results | Clear stored result when user signs out |
