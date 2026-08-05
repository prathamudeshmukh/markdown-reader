# Mermaid renders with `htmlLabels: false`

Mermaid's default label rendering embeds multi-line node labels as `<foreignObject><p>...<br>...</p></foreignObject>` — valid HTML5 (`<br>` needs no closing tag there) but invalid strict XML. Combined with ADR-0003 (diagrams render as `<img src="data:image/svg+xml;base64,...">`, not inline SVG), any diagram with a `\n` in a node label produced an SVG that silently failed to decode as an image (`naturalWidth`/`naturalHeight` both `0`, no console error) — caught live on a production document (`/d/E3mxU9m`) whose labels used `\n` for multi-line text (e.g. `"Load Balancer\n1.2.3.4\n..."`). Small single-line-label diagrams never hit this, which is why it wasn't caught by earlier smoke testing.

`htmlLabels: false` makes mermaid render all labels as plain SVG `<text>`/`<tspan>` elements instead, which are valid XML and still honor explicit line breaks — no visual regression, confirmed by re-rendering the same production diagram after the fix.
