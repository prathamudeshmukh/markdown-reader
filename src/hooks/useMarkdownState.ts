import { useState, useCallback, useRef } from 'react';
import { encodeMarkdown, decodeMarkdown } from '../utils/encoding';
import { readHash, writeHash } from '../utils/url';

type Mode = 'editor' | 'preview';

interface MarkdownState {
  markdownText: string;
  mode: Mode;
  decodeError: boolean;
}

// Warn when encoded content approaches practical URL limits (~8KB is safe across browsers)
const URL_SIZE_WARNING_BYTES = 8_000;
const DEBOUNCE_MS = 250;

function initializeState(): MarkdownState {
  const hash = readHash();
  if (!hash) {
    return { markdownText: '', mode: 'editor', decodeError: false };
  }
  try {
    const markdownText = decodeMarkdown(hash);
    return { markdownText, mode: 'preview', decodeError: false };
  } catch {
    return { markdownText: '', mode: 'editor', decodeError: true };
  }
}

export function useMarkdownState() {
  const [state, setState] = useState<MarkdownState>(initializeState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMarkdownText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, markdownText: text }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.length === 0) {
        writeHash('');
      } else {
        writeHash(encodeMarkdown(text));
      }
    }, DEBOUNCE_MS);
  }, []);

  const toggleMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: prev.mode === 'editor' ? 'preview' : 'editor',
    }));
  }, []);

  const isContentLarge =
    new TextEncoder().encode(state.markdownText).length > URL_SIZE_WARNING_BYTES;

  return { ...state, setMarkdownText, toggleMode, isContentLarge };
}
