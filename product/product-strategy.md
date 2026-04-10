# Scriptorum — Desktop/Laptop Adoption Strategy

## The Core Problem

The product is built mobile-first — bottom action bar, large touch targets, overflow menus. Desktop users are a secondary experience. To win them, the desktop must feel like the *power tier*, not an afterthought.

---

## Target Users

Three high-value segments:

| Segment | Job To Be Done | Current Alternative |
|---|---|---|
| **Developer / technical writer** | Write and share docs quickly without Notion overhead | HackMD, Typora, VS Code + preview |
| **Knowledge worker** | Take meeting notes, share with team via link | Notion, Confluence |
| **Student** | Write, study, share notes with classmates | Google Docs, Notion |

**Core competitive insight:** Scriptorum is faster than Notion and more shareable than local editors. That is the desktop wedge.

---

## Strategy 1: Make the Keyboard-First Experience World-Class

**Why:** Desktop users live in the keyboard. Scriptorum currently has 3 shortcuts (Ctrl+S, Ctrl+P, Ctrl+Shift+C) with no way to discover them.

**Tactics:**
- Add a keyboard shortcut cheat sheet triggered by `?` — this is a desktop power signal that builds stickiness
- Add shortcuts: `Ctrl+N` new doc, `Ctrl+E` toggle editor/preview, `Ctrl+K` command palette
- Add a **command palette** (Ctrl+K or Ctrl+Shift+P) — search across docs, run actions, navigate collections. Single highest-ROI desktop feature for a tool like this
- Show shortcut hints as tooltips on button hover (e.g., "Toggle preview  Ctrl+P")

**Expected impact:** Converts casual users into daily drivers; word-of-mouth from power users.

---

## Strategy 2: A Toolbar That Earns Desktop Screen Real Estate

**Why:** On desktop, horizontal space is available. The current header is sparse. A markdown formatting toolbar turns a niche tool into something approachable for non-developers.

**Tactics:**
- Add a **contextual markdown toolbar** between header and editor: Bold, Italic, Code, Link, Heading, Quote, List, Table
- Buttons insert markdown syntax at cursor position — no WYSIWYG needed
- Include an **"Insert table" helper** (the #1 markdown pain point for new users)
- Show/hide toolbar based on editor vs. preview mode

**Expected impact:** Lowers the barrier for knowledge workers and students who know what they want but not the markdown syntax.

---

## Strategy 3: Fix the Blank Slate Problem

**Why:** New users land on a blank editor with zero guidance. They don't know what the product does, what sets it apart, or how to use it. Desktop users evaluate tools critically before committing.

**Tactics:**
- **Sample document on first load**: Pre-populate with a short, scannable demo showcasing the product — headers, code blocks, a table, a link. Each section explains a feature inline (like Notion's starter page). Users can delete it immediately.
- **Contextual tooltips** on first visit: One-time callout bubbles on Share, QR Code, and Collections buttons
- **"Try it" landing experience**: Show a live embedded editor with a pre-written doc that demonstrates the instant shareable URL flow

**Expected impact:** Reduces immediate bounce; makes the "aha moment" (instant shareable URL) happen in 30 seconds, not 3 minutes.

---

## Strategy 4: Lean Into the "Instant Sharing" Superpower

**Why:** URL-hash sharing with no signup is Scriptorum's biggest differentiator against Notion and Confluence. Desktop users send links constantly. This needs to be front and center, not buried.

**Tactics:**
- **Persistent share button with copy animation** that reinforces the URL updating live — a small indicator showing "URL updated" when content changes
- **Social proof hook**: "Shared 847 times today" or "Join 1,200 writers using Scriptorum" — make sharing feel social
- **"Open in new tab" preview mode**: Open preview in a separate window — useful for writers who want editor on one side, preview on the other
- **Desktop notification on realtime join**: "Someone just opened your document" — makes collaboration feel alive and drives re-engagement

**Expected impact:** Turns every shared document into a viral acquisition loop. Recipients see the URL, wonder how it works, create their own doc.

---

## Strategy 5: Document Search and Management (the Retention Driver)

**Why:** Acquisition is irrelevant without retention. Desktop users with 10+ saved docs will churn without basic document management. There is currently no search, no sorting, no previews in the collection list.

**Tactics (phased):**
- **Phase 1**: Search/filter in the collections sidebar (by title). Single highest-retention feature.
- **Phase 2**: **Document preview on hover** — show first 100 chars of content when hovering a doc row
- **Phase 3**: **Document sorting** (last modified, alphabetical, created date) with persisted preference
- **Phase 4**: Soft-delete / **Trash** — a 30-day trash bin is a trust signal that removes fear of accidental deletion

**Expected impact:** Collections goes from "nice to have" to the reason users sign up and keep coming back.

---

## Strategy 6: Position Against Obsidian/Typora for the "No Install" Niche

**Why:** There is a real underserved audience that wants Obsidian-quality markdown editing without installing software — shared computers, IT-locked machines, Chromebooks. Scriptorum wins this by default.

**Tactics:**
- **"No install required" messaging** prominently on the page — a single line in the header or footer
- **PWA (Progressive Web App)**: Add `manifest.json` and service worker so users can "install" to their desktop from Chrome/Edge. This creates an app icon, removes browser chrome, and enables offline editing (hash mode works offline by definition)
- **Install prompt** after 3 sessions: "Add Scriptorum to your desktop?"

**Expected impact:** PWA installs are a strong retention signal — users who install are significantly more likely to return weekly. Creates a distinct distribution channel outside of app stores.

---

## Prioritized Roadmap

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P0 | Sample onboarding document + first-visit tooltips | Low | High |
| P0 | Keyboard shortcut tooltip hints on all buttons | Low | High |
| P1 | Command palette (Ctrl+K) | Medium | Very High |
| P1 | Markdown formatting toolbar (desktop only) | Medium | High |
| P1 | Collection search / filter | Medium | High |
| P2 | PWA manifest + install prompt | Low | High |
| P2 | Split-view: open preview in new tab | Low | Medium |
| P2 | Document preview on hover in sidebar | Medium | Medium |
| P3 | "Someone joined your doc" desktop notification | Medium | Medium |
| P3 | Trash / soft-delete (30-day retention) | Medium | Medium |

---

## North Star Metric

**Weekly Active Desktop Users** who have saved at least one document to a collection.

This captures both acquisition (desktop usage) and retention (enough perceived value to sign up and organise). The single biggest lever to move it: **P0 onboarding + P1 command palette** — get users to the "aha moment" faster, then give power users a reason to stay.
