import { escapeHtmlAttr } from './docMeta';

export const OG_IMAGE_FONT_NAME = 'Inter';
export const OG_IMAGE_TITLE_MAX_LENGTH = 100;
export const OG_IMAGE_WORDMARK_TEXT = 'openmark';
export const OG_IMAGE_FOOTER_TEXT = 'openmark.cc';

const OG_IMAGE_GRADIENT = 'radial-gradient(circle at 30% 20%, #1e1b4b 0%, #0d0d0d 65%)';
const OG_IMAGE_PADDING = 72;
const OG_IMAGE_TITLE_SIZE = 64;
const OG_IMAGE_WORDMARK_SIZE = 28;
const OG_IMAGE_FOOTER_SIZE = 22;
const OG_IMAGE_BADGE_SIZE = 56;
const OG_IMAGE_BADGE_RADIUS = 14;
const OG_IMAGE_BADGE_BG = '#111111';
const OG_IMAGE_ACCENT = '#818cf8';
const OG_IMAGE_ACCENT_LIGHT = '#c7d2fe';
const OG_IMAGE_GLYPH_COLOR = '#6366f1';
const OG_IMAGE_ROW_GAP = 16;

function truncateForImage(title: string): string {
  if (title.length <= OG_IMAGE_TITLE_MAX_LENGTH) return title;
  return `${title.slice(0, OG_IMAGE_TITLE_MAX_LENGTH).trimEnd()}…`;
}

// Every <div> below declares an explicit `display` — this version of workers-og's
// HTML-to-Satori parser throws "Expected <div> to have explicit display" otherwise,
// even for empty leaf divs with no children.
function renderLogoBadge(): string {
  const bar = (left: number, top: number, width: number, height: number): string =>
    `<div style="display: flex; position: absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; border-radius: 2px; background: ${OG_IMAGE_GLYPH_COLOR};"></div>`;

  const bars = [bar(20, 13, 4, 30), bar(32, 13, 4, 30), bar(12, 22, 31, 4), bar(12, 31, 31, 4)].join('');
  return `<div style="display: flex; position: relative; width: ${OG_IMAGE_BADGE_SIZE}px; height: ${OG_IMAGE_BADGE_SIZE}px; border-radius: ${OG_IMAGE_BADGE_RADIUS}px; background: ${OG_IMAGE_BADGE_BG};">${bars}</div>`;
}

function renderBrandRow(): string {
  const wordmark = `<span style="font-family: '${OG_IMAGE_FONT_NAME}'; font-weight: 700; font-size: ${OG_IMAGE_WORDMARK_SIZE}px; color: ${OG_IMAGE_ACCENT_LIGHT};">${OG_IMAGE_WORDMARK_TEXT}</span>`;
  return `<div style="display: flex; align-items: center; gap: ${OG_IMAGE_ROW_GAP}px;">${renderLogoBadge()}${wordmark}</div>`;
}

function renderFooterRow(): string {
  const footer = `<span style="font-family: '${OG_IMAGE_FONT_NAME}'; font-weight: 700; font-size: ${OG_IMAGE_FOOTER_SIZE}px; color: ${OG_IMAGE_ACCENT};">${OG_IMAGE_FOOTER_TEXT}</span>`;
  return `<div style="display: flex; width: 100%; justify-content: flex-end;">${footer}</div>`;
}

export function buildOgImageHtml(title: string): string {
  const safeTitle = escapeHtmlAttr(truncateForImage(title));
  const heading = `<h1 style="font-family: '${OG_IMAGE_FONT_NAME}'; font-weight: 700; font-size: ${OG_IMAGE_TITLE_SIZE}px; color: white; margin: 0; line-height: 1.15;">${safeTitle}</h1>`;
  return `<div style="display: flex; flex-direction: column; justify-content: space-between; height: 100vh; width: 100vw; background: ${OG_IMAGE_GRADIENT}; padding: ${OG_IMAGE_PADDING}px; overflow: hidden;">${renderBrandRow()}${heading}${renderFooterRow()}</div>`;
}
