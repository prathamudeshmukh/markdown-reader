import { useState, useCallback, useRef } from 'react';
import { beautifyMarkdown } from '../api/beautifyApi';
import { track, getContentLengthBucket, getErrorType } from '../telemetry';
import type { BeautifyResult } from '../ai/beautifyTypes';
import type { InteractionSource } from '../telemetry';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface BeautifyState {
  result: BeautifyResult | null;
  status: Status;
  error: string | null;
}

export interface UseBeautifyOptions {
  initialResult?: BeautifyResult;
  initialHash?: string;
  onSave?: (result: BeautifyResult, hash: string) => void;
}

export function contentHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}

export function useBeautify(markdownText: string, options: UseBeautifyOptions = {}) {
  const { initialResult, initialHash, onSave } = options;

  const [state, setState] = useState<BeautifyState>(() => {
    if (initialResult) {
      return { result: initialResult, status: 'success', error: null };
    }
    return { result: null, status: 'idle', error: null };
  });

  const isLoadingRef = useRef(false);
  const cacheRef = useRef(new Map<string, BeautifyResult>());

  const isStale =
    initialHash !== undefined && contentHash(markdownText) !== initialHash;

  const run = useCallback(
    async (bypassCache: boolean, source: InteractionSource = 'button') => {
      if (!markdownText.trim()) return;
      if (isLoadingRef.current) return;

      const hash = contentHash(markdownText);

      if (!bypassCache && cacheRef.current.has(hash)) {
        const cached = cacheRef.current.get(hash)!;
        setState({ result: cached, status: 'success', error: null });
        track('beautify_triggered', {
          content_length_bucket: getContentLengthBucket(markdownText),
          source,
          from_cache: true,
        });
        return;
      }

      isLoadingRef.current = true;
      setState({ result: null, status: 'loading', error: null });
      track('beautify_triggered', {
        content_length_bucket: getContentLengthBucket(markdownText),
        source,
        from_cache: false,
      });

      try {
        const result = await beautifyMarkdown(markdownText);
        cacheRef.current.set(hash, result);
        setState({ result, status: 'success', error: null });
        track('beautify_succeeded', {
          content_length_bucket: getContentLengthBucket(markdownText),
          theme: result.theme,
          node_count: result.nodes.length,
        });
        if (onSave) {
          try {
            onSave(result, hash);
          } catch (saveErr) {
            console.error('beautify save failed', saveErr);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI beautification failed';
        setState({ result: null, status: 'error', error: message });
        track('beautify_failed', {
          content_length_bucket: getContentLengthBucket(markdownText),
          error_type: getErrorType(err),
        });
      } finally {
        isLoadingRef.current = false;
      }
    },
    [markdownText, onSave],
  );

  const trigger = useCallback(() => { void run(false); }, [run]);

  const rerun = useCallback(() => {
    cacheRef.current.delete(contentHash(markdownText));
    track('beautify_rerun', { content_length_bucket: getContentLengthBucket(markdownText) });
    void run(true);
  }, [markdownText, run]);

  return { ...state, isStale, trigger, rerun };
}
