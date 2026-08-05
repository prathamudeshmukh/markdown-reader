import type { PreviewThemeId } from '../themes/previewThemes';
import { getMermaidConfig } from './mermaidThemes';

export class MermaidSyntaxError extends Error {}

let renderCounter = 0;

// Mermaid emits width="100%" with no height attribute on the root <svg> —
// meant for inline DOM embedding, where the browser resolves the percentage
// against the surrounding layout. As an <img> data URL (ADR-0003) that leaves
// the image with no definite intrinsic size, so it stretches to fill the
// column instead of sizing to the diagram's natural dimensions. Replacing
// width/height with the viewBox's absolute values gives the <img> a real
// intrinsic size to shrink-to-fit from.
function normalizeSvgIntrinsicSize(svg: string): string {
  const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBoxMatch) return svg;
  const [, width, height] = viewBoxMatch;

  return svg.replace(/^<svg([^>]*)>/, (_full, attrs: string) => {
    const withoutSize = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    return `<svg${withoutSize} width="${width}" height="${height}">`;
  });
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function renderMermaidToDataUrl(
  source: string,
  themeId: PreviewThemeId,
): Promise<string> {
  const { default: mermaid } = await import('mermaid');

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    // Mermaid's default HTML-labels mode renders multi-line node labels via
    // <foreignObject><p>...<br>...</p></foreignObject>. <br> is unclosed
    // HTML5 (valid there, invalid strict XML) — any label containing a line
    // break makes the SVG fail to parse as image/svg+xml once embedded as an
    // <img> data URL (ADR-0003), even though the same markup renders fine
    // inline in a browser's lenient HTML parser. Plain SVG <tspan> labels
    // don't have this problem and still honor explicit line breaks.
    htmlLabels: false,
    ...getMermaidConfig(themeId),
  });

  const id = `mermaid-diagram-${renderCounter++}`;

  let svg: string;
  try {
    ({ svg } = await mermaid.render(id, source));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid diagram syntax';
    throw new MermaidSyntaxError(message);
  }

  return `data:image/svg+xml;base64,${toBase64(normalizeSvgIntrinsicSize(svg))}`;
}
