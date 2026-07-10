import { escapeHtmlAttr, type DocMeta } from './docMeta';

const TWITTER_CARD_LARGE_IMAGE = 'summary_large_image';

function replaceAttrContent(html: string, pattern: RegExp, value: string): string {
  return html.replace(pattern, (_match, prefix: string, suffix: string) => `${prefix}${value}${suffix}`);
}

export function injectDocMeta(html: string, meta: DocMeta): string {
  const title = escapeHtmlAttr(meta.title);
  const description = escapeHtmlAttr(meta.description);
  const url = escapeHtmlAttr(meta.url);
  const imageUrl = escapeHtmlAttr(meta.imageUrl);

  let result = html;
  result = replaceAttrContent(result, /(<title>)[^<]*(<\/title>)/, title);
  result = replaceAttrContent(result, /(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/>)/, title);
  result = replaceAttrContent(result, /(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/>)/, description);
  result = replaceAttrContent(result, /(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/>)/, url);
  result = replaceAttrContent(result, /(<meta\s+property="og:image"\s+content=")[^"]*("\s*\/>)/, imageUrl);
  result = replaceAttrContent(result, /(<meta\s+name="twitter:card"\s+content=")[^"]*("\s*\/>)/, TWITTER_CARD_LARGE_IMAGE);
  result = replaceAttrContent(result, /(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/>)/, title);
  result = replaceAttrContent(result, /(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/>)/, description);
  result = replaceAttrContent(result, /(<meta\s+name="twitter:image"\s+content=")[^"]*("\s*\/>)/, imageUrl);
  result = replaceAttrContent(result, /(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/>)/, url);
  return result;
}
