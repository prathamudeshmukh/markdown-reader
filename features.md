Below is a detailed project document you can use as a PRD + engineering handoff.

Project Document

Project Name

URL-Embedded Markdown Reader

1. Overview

This project is a simple browser-based markdown editor and reader where the entire markdown content is stored in the URL itself as a Base64-encoded string.

The core idea is:
	•	A user types markdown into an editor
	•	On every text change, the app encodes the markdown content into Base64
	•	The encoded value is appended to the URL
	•	That same URL becomes a shareable link containing the full document state
	•	Anyone opening that URL can instantly view the rendered markdown without needing backend storage

This makes the app extremely lightweight, portable, and easy to share.

⸻

2. Problem Statement

Most markdown tools require one of these:
	•	local file storage
	•	browser local storage
	•	server-side persistence
	•	login and account system

For a very simple read/write use case, that adds unnecessary complexity.

This project solves that by using the URL itself as the storage mechanism for the markdown content.

⸻

3. Goals

Primary Goals
	•	Allow users to write markdown in a text editor
	•	Convert markdown text to Base64 on every content change
	•	Persist the encoded content inside the URL
	•	Provide a preview mode to render markdown
	•	Support mode switching through a toggle button
	•	Open in editor mode when no encoded content is present in the URL
	•	Open in preview mode when encoded content exists in the URL

Secondary Goals
	•	Make the document shareable via URL
	•	Keep the implementation frontend-only
	•	Keep the UI minimal and easy to use

⸻

4. Non-Goals

These are intentionally out of scope for the first version:
	•	user accounts
	•	backend database
	•	autosave to cloud
	•	markdown collaboration
	•	version history
	•	rich text editing
	•	attachments or image uploads
	•	custom themes
	•	SEO indexing of content pages
	•	document management dashboard

⸻

5. Core Feature Requirements

5.1 Markdown Editing

The application should provide a text editor where the user can type markdown content.

Expected behavior
	•	The editor accepts plain markdown text
	•	The editor is editable only in editor mode
	•	Every keystroke or text change updates the encoded content in the URL

⸻

5.2 Base64 Encoding in URL

The app should encode the current markdown content into Base64 and store it in the URL.

Expected behavior
	•	On every change in editor content:
	•	read the current markdown text
	•	encode it into Base64
	•	update the URL with the new encoded content
	•	The page should not fully reload during URL updates
	•	The user should be able to copy and share the URL

Suggested URL format

Hash fragment
/ #<base64EncodedMarkdown>

Example:
https://yourapp.com/#SGVsbG8gIyBXb3JsZA==

Recommendation

Use query param or hash fragment depending on your routing preference.
For a very simple frontend-only app, hash fragment is usually easier and avoids some encoding issues with routers and reload behavior.

⸻

5.3 Preview Mode

The app should render the markdown content as formatted HTML in preview mode.

Expected behavior
	•	Markdown content is parsed and rendered visually
	•	Preview mode is read-only
	•	If URL contains valid encoded content, app should open directly in preview mode

⸻

5.4 Toggle Button

The app should provide a toggle button to switch between:
	•	Editor mode
	•	Preview mode

Expected behavior
	•	If currently in editor mode, clicking toggle switches to preview
	•	If currently in preview mode, clicking toggle switches to editor
	•	Toggle should work regardless of whether the content came from typing or URL decode

⸻

5.5 Default Opening Behavior

Rule 1

If there is no Base64 content in the URL, the app opens in editor mode

Rule 2

If there is Base64 content in the URL, the app opens in preview mode

Expected initialization flow
	1.	Read URL
	2.	Check if encoded content exists
	3.	If no content found:
	•	initialize empty editor
	•	set mode to editor
	4.	If content found:
	•	decode Base64
	•	load markdown into state
	•	set mode to preview

⸻

6. User Stories

Story 1: Write markdown

As a user, I want to type markdown into an editor so that I can create content quickly.

Story 2: Share through link

As a user, I want the markdown to be stored in the URL so that I can share a link without saving files or using a backend.

Story 3: Preview content

As a user, I want to preview the rendered markdown so that I can see the final output.

Story 4: Open shared links directly

As a user, I want a shared link to open directly in preview mode so that I can read the markdown immediately.

Story 5: Edit shared content

As a user, I want to switch back to editor mode from preview mode so that I can modify the content and generate a new shareable URL.

⸻

7. Functional Requirements

7.1 URL Read and Decode

The app must:
	•	read encoded content from the URL on page load
	•	decode Base64 into markdown text
	•	populate editor state with decoded content
	•	gracefully handle invalid Base64 input

7.2 URL Update on Text Change

The app must:
	•	listen to editor content changes
	•	encode markdown text into Base64
	•	update the browser URL without page refresh

7.3 Markdown Rendering

The app must:
	•	convert markdown into rendered output in preview mode
	•	support standard markdown syntax:
	•	headings
	•	bold
	•	italic
	•	lists
	•	links
	•	code blocks
	•	blockquotes

7.4 Mode Management

The app must:
	•	manage two UI modes:
	•	editor
	•	preview
	•	set initial mode based on URL content presence
	•	allow user-controlled toggle after initialization

7.5 Invalid Content Handling

The app should:
	•	not crash if the URL contains malformed or invalid Base64
	•	fall back to editor mode if decode fails
	•	optionally show a small warning message like:
	•	“Invalid content found in URL. Opened in editor mode.”

⸻

8. Non-Functional Requirements

Performance
	•	URL update should feel instant
	•	typing experience should remain smooth
	•	markdown rendering should be quick for small to medium text

Usability
	•	interface should be simple and distraction-free
	•	toggle should be obvious
	•	editor and preview should be easy to distinguish

Reliability
	•	decoding errors should be handled safely
	•	content should remain consistent between editor and preview

Portability
	•	app should work as a static frontend app
	•	no backend dependency required

⸻

9. Technical Design

9.1 Suggested Tech Stack

A simple stack could be:
	•	Frontend: React / Next.js / Vite
	•	Markdown parser: marked, react-markdown, or similar
	•	Styling: basic CSS / Tailwind CSS
	•	Routing: browser URL APIs

Recommendation

For simplicity:
	•	React + Vite
	•	react-markdown
	•	URLSearchParams or window.location.hash
	•	history.replaceState

⸻

9.2 State Model

Suggested state variables:
	•	markdownText: string
	•	mode: 'editor' | 'preview'
	•	hasUrlContent: boolean
	•	decodeError: boolean

⸻

9.3 Encoding Flow

On editor change
	1.	User types in textarea
	2.	App updates markdownText
	3.	App encodes content to Base64
	4.	App writes encoded string into URL using history.replaceState
	5.	UI remains in current mode

⸻

9.4 Decoding Flow

On page load
	1.	Read encoded value from URL
	2.	If absent:
	•	set empty text
	•	set editor mode
	3.	If present:
	•	attempt Base64 decode
	•	if successful:
	•	populate text
	•	set preview mode
	•	if failed:
	•	empty text or preserve raw fallback
	•	set editor mode
	•	optionally show error

⸻

10. Important Technical Considerations

10.1 URL Length Limit

This is the biggest limitation of this design.

Since the full content is stored inside the URL:
	•	very large markdown documents may exceed browser URL limits
	•	different browsers have different practical URL length limits
	•	Base64 also increases content size compared to original text

Impact

This solution is best suited for:
	•	short notes
	•	small markdown snippets
	•	small shareable documents
	•	examples and demos

Recommendation

Add a soft limit and warning when content becomes too large.

Example:
	•	show warning when content exceeds a safe threshold
	•	message: “Content may be too large for reliable URL sharing”

⸻

10.2 Base64 and Unicode Support

Plain btoa() and atob() may break for Unicode characters.

Recommendation

Use a Unicode-safe encoding approach.

For example:
	•	use TextEncoder / TextDecoder
	•	then convert bytes to Base64 safely

This is important if users type:
	•	emoji
	•	non-English text
	•	special symbols

⸻

10.3 URL Safety

Base64 strings may contain characters like:
	•	+
	•	/
	•	=

These can be awkward in URLs.

Recommendation

Use Base64 URL-safe encoding:
	•	replace + with -
	•	replace / with _
	•	optionally trim =

This makes the URL cleaner and safer.

⸻

10.4 Browser History Handling

If URL changes on every keystroke and you use pushState, browser history will become unusable.

Recommendation

Use history.replaceState, not pushState.

That way:
	•	the current URL updates
	•	browser history does not get polluted on every keypress

⸻

10.5 Debouncing

Updating the URL on every keystroke may still be expensive.

Recommendation

Use a small debounce, such as:
	•	150ms to 300ms

This still feels instant while reducing repeated URL updates.

Note: your requirement says every text change should encode and append to URL. Debounce still respects that behavior while making implementation smoother.

⸻

11. UI/UX Proposal

Layout

A very basic layout can have:
	•	header
	•	app title
	•	toggle button
	•	main area
	•	editor textarea or markdown preview based on mode

Editor Mode
	•	large textarea
	•	placeholder text such as:
	•	“Start typing markdown…”

Preview Mode
	•	rendered markdown container
	•	scrollable content area

Buttons
	•	Toggle button label can dynamically change:
	•	“Show Preview” when in editor mode
	•	“Show Editor” when in preview mode

Optional extras:
	•	copy link button
	•	clear content button

⸻

12. Edge Cases

The app should handle these properly:

Case 1: Empty URL
	•	open editor mode
	•	empty textarea

Case 2: Invalid Base64 in URL
	•	show fallback editor mode
	•	optional warning message

Case 3: Very large content
	•	warn user that URL may become too long

Case 4: Unicode markdown
	•	ensure correct encode/decode

Case 5: User opens preview link and wants to edit
	•	toggle back to editor
	•	content remains intact

Case 6: Empty editor after deleting all text
	•	URL should become empty or remove the data param/hash
	•	app remains in editor mode if freshly loaded with empty URL

⸻

13. Suggested URL Strategy

I would recommend this behavior:

When content is empty

Remove the encoded value from the URL entirely

Examples:
	•	https://app.com/
instead of
	•	https://app.com/?data=

This keeps the URL clean and supports your default open-in-editor behavior.

⸻

14. Security Considerations

Since content is coming from the URL and rendered as markdown:
	•	treat decoded content as untrusted input
	•	sanitize rendered HTML if raw HTML is supported
	•	preferably disable unsafe raw HTML rendering unless explicitly needed

Recommendation

Use a markdown renderer that does not blindly inject raw HTML, or add sanitization.

This matters because shared URLs can contain malicious content.

⸻

15. Acceptance Criteria

The project is complete when all of the following work:
	1.	User can type markdown into an editor
	2.	Every content change updates the URL with Base64-encoded content
	3.	User can switch between editor and preview using a toggle button
	4.	App opens in editor mode when URL has no encoded content
	5.	App opens in preview mode when URL has encoded content
	6.	Decoded markdown content renders correctly in preview
	7.	Invalid URL content does not crash the app
	8.	Browser page does not reload while URL updates
	9.	Unicode text works correctly
	10.	Empty content results in a clean URL state

⸻

16. Suggested Implementation Breakdown

Phase 1: Basic App Shell
	•	create page layout
	•	add editor textarea
	•	add preview container
	•	add mode toggle button

Phase 2: URL Read/Write
	•	parse URL on page load
	•	implement Base64 encode/decode
	•	update URL on editor change
	•	use replaceState

Phase 3: Markdown Rendering
	•	render markdown in preview mode
	•	style headings, lists, code blocks

Phase 4: Error Handling
	•	handle invalid Base64
	•	handle empty content
	•	handle Unicode safely

Phase 5: UX Improvements
	•	debounce updates
	•	add copy link button
	•	add content length warning

⸻

17. Example App Flow

Scenario A: New user opens app
	•	URL has no content
	•	app opens editor mode
	•	user types markdown
	•	URL updates continuously
	•	user clicks preview
	•	rendered markdown is displayed

Scenario B: Shared link is opened
	•	URL contains encoded markdown
	•	app decodes content
	•	app opens preview mode
	•	user reads content
	•	user clicks “Show Editor”
	•	edits content
	•	URL updates with new encoded version

⸻

18. Risks and Constraints

Risk 1: URL length limitations

This is the main architectural limitation.

Risk 2: Unicode encoding bugs

Need correct encoding approach from the start.

Risk 3: XSS or unsafe HTML rendering

Need safe markdown rendering.

Risk 4: Excessive URL updates

Debounce and replaceState should help.

⸻

19. Future Enhancements

These can come later if needed:
	•	copy share link button
	•	dark mode
	•	split editor/preview mode
	•	markdown syntax toolbar
	•	local storage fallback for large documents
	•	compression before Base64
	•	short-link generator backed by a server
	•	import/export .md file
	•	live side-by-side preview

⸻

20. Recommended MVP Definition

For the first version, keep it to:
	•	textarea markdown editor
	•	Base64 URL persistence
	•	preview rendering
	•	toggle button
	•	initial mode based on URL content
	•	invalid content fallback
	•	Unicode-safe handling

That is enough to validate the idea.

