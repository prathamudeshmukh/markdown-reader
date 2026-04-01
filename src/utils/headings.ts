export interface Heading {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4;
}

// Strip inline markdown formatting: **bold**, *italic*, `code`, ~~strike~~, [text](url)
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/[*_~`]+(.+?)[*_~`]+/g, '$1')    // bold/italic/strike/code
    .trim();
}

export function slugify(text: string, seen?: Map<string, number>): string {
  const slug = stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!seen) return slug;

  const count = seen.get(slug) ?? 0;
  seen.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count + 1}`;
}

const HEADING_RE = /^(#{1,4})\s+(.+)$/gm;

export function extractHeadings(markdown: string): Heading[] {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];

  let match: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;

  while ((match = HEADING_RE.exec(markdown)) !== null) {
    const level = match[1].length as 1 | 2 | 3 | 4;
    const raw = match[2].trim();
    const text = stripInlineMarkdown(raw);
    const id = slugify(raw, seen);
    headings.push({ id, text, level });
  }

  return headings;
}
