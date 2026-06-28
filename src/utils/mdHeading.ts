export interface H1Extraction {
  heading: string | null;
  rest: string;
}

export function extractLeadingH1(markdown: string): H1Extraction {
  const lines = markdown.split('\n');
  let h1Index = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (/^# .+/.test(lines[i])) h1Index = i;
    break;
  }

  if (h1Index === -1) return { heading: null, rest: markdown };

  const heading = lines[h1Index].slice(2).trim();

  let restStart = h1Index + 1;
  while (restStart < lines.length && lines[restStart].trim() === '') restStart++;

  return { heading, rest: lines.slice(restStart).join('\n') };
}
