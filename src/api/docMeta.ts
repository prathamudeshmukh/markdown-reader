import { extractLeadingH1 } from '../utils/mdHeading';
import { markdownToPlainText } from '../utils/markdownToPlainText';

export const DESCRIPTION_MAX_LENGTH = 155;
export const UNTITLED_DOCUMENT_TITLE = 'Untitled document';
export const GENERIC_SITE_DESCRIPTION =
  'A free, open, privacy-first online Markdown editor and viewer. Write, preview, and share Markdown documents instantly — no account needed.';

export interface DocMeta {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
}

export function deriveTitle(doc: { title: string | null; content: string }): string {
  const trimmedTitle = doc.title?.trim();
  if (trimmedTitle) return trimmedTitle;

  const { heading } = extractLeadingH1(doc.content);
  if (heading) return heading;

  return UNTITLED_DOCUMENT_TITLE;
}

export function deriveDescription(doc: { content: string }): string {
  const plainText = markdownToPlainText(doc.content);
  if (!plainText) return GENERIC_SITE_DESCRIPTION;
  if (plainText.length <= DESCRIPTION_MAX_LENGTH) return plainText;
  return `${plainText.slice(0, DESCRIPTION_MAX_LENGTH).trimEnd()}…`;
}

const HTML_ATTR_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtmlAttr(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ATTR_ESCAPES[char]);
}
