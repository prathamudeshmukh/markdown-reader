# openmark

A markdown editor/reader with realtime collaboration, comments, and collections, persisted to Supabase and served via a Cloudflare Worker.

## Language

**Diagram**:
A mermaid-rendered visual (flowchart, sequence, ER, etc.) produced from a ` ```mermaid ` fenced code block in a document's markdown content. Rendered only in Preview mode, as a static image — not live SVG.
_Avoid_: Chart, graph, Mermaid block (the latter refers to the raw fenced source, not the rendered result)

**Diagram source**:
The raw ` ```mermaid ` fenced markdown text a user writes, before rendering. Distinct from the Diagram it produces.
