import Anthropic from '@anthropic-ai/sdk';
import { buildBeautifyPrompt } from '../ai/beautifyPrompt';
import { parseBeautifyResult } from '../ai/beautifySchema';
import { json } from './workerUtils';

export interface BeautifyEnv {
  ANTHROPIC_API_KEY: string;
}

const API_PATH = '/api/beautify';
const MAX_CONTENT_CHARS = 30_000;
const MODEL = 'claude-sonnet-4-6';

export async function handleBeautifyRequest(
  request: Request,
  env: BeautifyEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== API_PATH || request.method !== 'POST') return null;

  const body = (await request.json()) as { content?: unknown };

  if (typeof body.content !== 'string' || body.content.length === 0) {
    return json({ error: 'content is required and must be a non-empty string' }, 400);
  }

  if (body.content.length > MAX_CONTENT_CHARS) {
    return json({ error: 'Content too large for AI beautification (max 30 000 chars)' }, 413);
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildBeautifyPrompt(body.content) }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const rawText = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    const result = parseBeautifyResult(rawText);
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('invalid') || message.includes('invalid JSON') || message.includes('component tree')) {
      return json({ error: 'AI returned an invalid component tree' }, 422);
    }
    return json({ error: 'AI beautification failed' }, 500);
  }
}
