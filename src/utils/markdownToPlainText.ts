export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^```.*$/gm, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
