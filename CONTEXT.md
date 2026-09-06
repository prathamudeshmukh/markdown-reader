# openmark

A markdown editor/reader with realtime collaboration, comments, and collections, persisted to Supabase and served via a Cloudflare Worker.

## Language

**Diagram**:
A mermaid-rendered visual (flowchart, sequence, ER, etc.) produced from a ` ```mermaid ` fenced code block in a document's markdown content. Rendered only in Preview mode, as a static image — not live SVG.
_Avoid_: Chart, graph, Mermaid block (the latter refers to the raw fenced source, not the rendered result)

**Diagram source**:
The raw ` ```mermaid ` fenced markdown text a user writes, before rendering. Distinct from the Diagram it produces.

**Image drop**:
The gesture of dragging one or more image files onto the Editor to insert them into a saved document. Distinct from dragging a `.md` file onto the Editor, which replaces the whole document instead.
_Avoid_: Image upload (describes the storage mechanism, not the user's action), image paste (not supported)

**Upload placeholder**:
The literal `![Uploading <filename>…]()` markdown text inserted into the document at the moment of an Image drop, standing in for an image whose upload hasn't finished yet. It is ordinary document text — autosaved and broadcast to collaborators like any other edit — replaced in place once the upload resolves, or removed if it fails.
_Avoid_: Progress indicator (implies a live-updating widget; this is static placeholder text)

**Uploaded image**:
A user's image file stored in the images bucket once its Image drop resolves, referenced from the document by its public URL. Distinct from a Diagram, which is generated from markdown source rather than uploaded as a binary file.
_Avoid_: Image (too generic — could mean this or a Diagram's rendered output)
