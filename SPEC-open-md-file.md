# SPEC: Open Markdown File

## 1. Objective

Allow users to open a local `.md` / `.markdown` file into the editor from two entry points: a toolbar button in the header and drag-and-drop onto the editor area.

**Target users**: anyone using Openmark who has existing markdown files on disk and wants to view or edit them without copy-pasting.

---

## 2. Acceptance Criteria

### AC-1 — Header toolbar button

- A file-open button appears in the "File ops" `ToolGroup` in [Header.tsx](src/components/Header.tsx), immediately before the existing "Import PDF" button.
- Clicking it opens a native file picker that accepts `.md` and `.markdown` files only.
- The button is always enabled (no preconditions on slug or content).
- On mobile the button appears in the overflow menu (same section as "Import PDF").

### AC-2 — Drag-and-drop onto editor

- When the user drags a `.md`/`.markdown` file over the editor area ([Editor.tsx](src/components/Editor.tsx)), a visual drop-zone overlay appears.
- Dropping the file triggers the same open flow as the toolbar button.
- Dragging any other file type shows an error indicator and is rejected.

### AC-3 — Current-doc guard

- If the current doc **has no slug** (unsaved) **and has non-empty content**, a confirmation dialog appears:  
  *"You have unsaved changes. Save before opening a new file?"*  
  - **Save & Open**: POSTs current content to Supabase (same as `saveDoc`), then continues.  
  - **Discard & Open**: discards current content and continues without saving.  
  - **Cancel**: dismisses and does nothing.
- If the current doc is already saved (has a slug) or is empty, the guard is skipped.

### AC-4 — File loading

- File content is read via the browser File API (`file.text()`).
- The filename (without extension) is used as a suggested title pre-filled in the doc.
- Loaded content is placed into editor mode (`mode: 'editor'`) as an unsaved document with no slug.
- Navigation updates to `/mreader/` (base route, no slug).
- The file's first `# Heading` (if present) is shown as the doc title; otherwise the filename stem is used.

### AC-5 — Error cases

- File larger than **1 MB**: show an inline banner error — *"File too large. Maximum size is 1 MB."*
- Non-UTF-8 / binary file: show — *"Could not read file. Make sure it is a valid text file."*
- Empty file: allowed — loads an empty editor.

### AC-6 — Keyboard shortcut

- `Ctrl+O` / `Cmd+O` triggers the file-open flow (same as clicking the toolbar button).
- Shortcut is registered in [useKeyboardShortcuts.ts](src/hooks/useKeyboardShortcuts.ts).
- Appears in the shortcut help modal ([ShortcutHelpModal.tsx](src/components/ShortcutHelpModal.tsx)) under a "File" section.

### AC-7 — Command palette

- A "Open markdown file" command is added to [CommandPalette.tsx](src/components/CommandPalette.tsx).

### AC-8 — Telemetry

- `md_file_opened` event emitted via `track()` with props:  
  `{ source: 'toolbar' | 'drag_drop' | 'keyboard' | 'command_palette', file_size_bytes: number, had_unsaved_changes: boolean }`

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (existing) |
| File reading | Browser File API (`file.text()`) — no new dependencies |
| State | `useMarkdownState.ts` — new `openMdFile(file, source)` action |
| Validation | Inline guard logic in the utility (no Zod needed for file meta) |
| Drag-and-drop | Native HTML drag events — no new library |

---

## 4. Project Structure

### New files

| File | Purpose |
|------|---------|
| `src/utils/mdFileReader.ts` | Pure utility: reads `File` → `string`, validates size/encoding, extracts title from first heading |
| `src/components/MarkdownDropZone.tsx` | Drag-and-drop overlay wrapper around the editor area |
| `src/components/OpenMdFileGuardModal.tsx` | "Unsaved changes" confirmation dialog |
| `src/utils/mdFileReader.test.ts` | Unit tests for the reader utility |
| `src/components/MarkdownDropZone.test.tsx` | Tests for drop zone acceptance/rejection |
| `src/components/OpenMdFileGuardModal.test.tsx` | Tests for guard dialog states |

### Modified files

| File | Change |
|------|--------|
| `src/hooks/useMarkdownState.ts` | Add `openMdFile(file, source)` action and guard modal visibility state |
| `src/hooks/useKeyboardShortcuts.ts` | Register `Ctrl+O` / `Cmd+O` |
| `src/components/Header.tsx` | Add open-file button + hidden `<input type="file" accept=".md,.markdown">` |
| `src/components/Editor.tsx` | Wrap with `MarkdownDropZone` |
| `src/components/ShortcutHelpModal.tsx` | Add `Ctrl+O` entry under "File" section |
| `src/components/CommandPalette.tsx` | Add "Open markdown file" command |
| `src/App.tsx` | Wire `onOpenMdFile` action; render `OpenMdFileGuardModal` |
| `src/telemetry/types.ts` | Add `md_file_opened` event type |

---

## 5. Code Style

- Follow all rules in `.claude/rules/common/coding-style.md` and TypeScript extensions.
- **Immutability**: `openMdFile` returns a new state object — never mutate existing state.
- **Small files**: `mdFileReader.ts` should be ≤ 80 lines; split further if it grows.
- **No `console.log`** in production paths.
- **Max 3 parameters**: `openMdFile(file: File, source: InteractionSource)` — two params.
- Constants (`MAX_MD_FILE_BYTES = 1_048_576`) defined at the top of the utility file.

---

## 6. Testing Strategy

Minimum 80% coverage. All tests use Vitest + React Testing Library (existing setup).

### Unit tests — `mdFileReader.ts`

- Reads valid UTF-8 `.md` content correctly
- Returns first `# Heading` as title
- Falls back to filename stem when no heading present
- Rejects files > 1 MB with a typed error
- Handles empty file (returns empty string, title = filename stem)

### Unit tests — `OpenMdFileGuardModal.tsx`

- Renders "Save & Open", "Discard & Open", "Cancel" buttons
- Calls correct callback for each action
- Does not render when `open={false}`

### Unit tests — `MarkdownDropZone.tsx`

- Shows overlay on `dragenter` with a `.md` file
- Hides overlay on `dragleave` / `drop`
- Calls `onFile` with the dropped file when it is `.md`
- Calls `onRejected` when file is not `.md`

### Integration tests — `useMarkdownState.ts`

- `openMdFile` with empty current doc: loads content directly, no guard shown
- `openMdFile` with unsaved non-empty doc: sets guard visibility to `true`
- Guard "Discard & Open" path: content replaced, mode set to `'editor'`, slug cleared
- Guard "Cancel" path: state unchanged
- File > 1 MB: `state.error` set, no change to content

### Keyboard shortcut test — `useKeyboardShortcuts.ts`

- `Ctrl+O` fires `onOpenMdFile` callback

---

## 7. Boundaries

### Always do
- Validate file type (MIME or extension) before reading
- Cap file size at 1 MB client-side
- Reset `slug` to `null` and navigate to `/mreader/` after loading
- Emit telemetry event on every successful open

### Ask first
- Supporting additional plain-text formats (`.txt`, `.rst`) in a follow-up

### Never do
- Send file content to the Worker or Supabase automatically — user must explicitly hit Save
- Allow binary files or files > 1 MB to be read into memory
- Skip the unsaved-changes guard when content is non-empty and slug is null
