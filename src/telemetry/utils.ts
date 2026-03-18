import type { ContentLengthBucket } from './types';

const SESSION_STORAGE_KEY = 'mreader:telemetrySessionId';

export function getContentLengthBucket(content: string): ContentLengthBucket {
  const length = content.length;
  if (length === 0) return 'empty';
  if (length < 200) return 'xs';
  if (length < 1_000) return 'sm';
  if (length < 5_000) return 'md';
  return 'lg';
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const next = generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return generateSessionId();
  }
}

export function getErrorType(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/HTTP 4\d\d/i.test(message)) return 'http_4xx';
  if (/HTTP 5\d\d/i.test(message)) return 'http_5xx';
  if (/network|fetch/i.test(message)) return 'network';
  return 'unknown';
}
