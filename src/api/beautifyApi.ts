import type { BeautifyResult } from '../ai/beautifyTypes';

export async function beautifyMarkdown(content: string): Promise<BeautifyResult> {
  const res = await fetch('/mreader/api/beautify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'AI beautification failed' })) as { error?: string };
    throw new Error(body.error ?? 'AI beautification failed');
  }

  return res.json() as Promise<BeautifyResult>;
}
