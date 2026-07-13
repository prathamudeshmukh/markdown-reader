import { lookupApiKey, touchApiKeyLastUsed } from './repository/apiKeys';
import type { SupabaseEnv } from './repository/shared';

export interface ApiKeyContext {
  userId: string;
  keyId: string;
}

const KEY_PREFIX = 'omk_';
const KEY_BODY_LENGTH = 32;
const VALID_KEY_LENGTH = KEY_PREFIX.length + KEY_BODY_LENGTH;

function isValidKeyFormat(raw: string): boolean {
  return raw.startsWith(KEY_PREFIX) && raw.length === VALID_KEY_LENGTH;
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function resolveApiKey(
  request: Request,
  env: SupabaseEnv,
): Promise<ApiKeyContext | null> {
  const rawKey = request.headers.get('X-OpenMark-Key');
  if (!rawKey) return null;

  if (!isValidKeyFormat(rawKey)) {
    throw new Error('Invalid API key');
  }

  const keyHash = await sha256Hex(rawKey);
  const row = await lookupApiKey(env, keyHash);

  if (!row) {
    throw new Error('Invalid API key');
  }

  // Fire-and-forget — never block the request path on this
  touchApiKeyLastUsed(env, row.id).catch(() => undefined);

  return { userId: row.userId, keyId: row.id };
}
