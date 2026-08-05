# Client-side, lazy-loaded Mermaid rendering

Mermaid diagram support is implemented entirely client-side: the `mermaid` package is dynamically imported (`import('mermaid')`) the first time a ` ```mermaid ` fence is encountered while rendering a document, and renders SVG directly into the DOM. We rejected server-side rendering (e.g. a Worker route calling an external rendering service, mirroring the PDF-to-markdown flow) because it would add a new backend dependency for no benefit — Preview already renders entirely client-side via `react-markdown`. The dynamic import keeps the ~600KB+ mermaid library out of the main bundle for the common case of documents with no diagrams.

## Considered Options

- Server-side rendering via the Worker (like `PDF2MARKDOWN_API_URL`) — rejected: new external dependency, inconsistent with Preview's existing client-only rendering model.
- Static top-level import of `mermaid` — rejected: pays the bundle-size cost on every page load regardless of whether the doc contains diagrams.
