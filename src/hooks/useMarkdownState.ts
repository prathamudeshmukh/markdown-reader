import { useState, useCallback, useEffect, useRef } from 'react';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';

type Mode = 'editor' | 'preview';

interface MarkdownState {
  markdownText: string;
  slug: string | null;
  mode: Mode;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 250;

export function useMarkdownState() {
  const slug = getSlugFromPath();

  const [state, setState] = useState<MarkdownState>({
    markdownText: '',
    slug,
    mode: 'editor',
    isLoading: slug !== null,
    isSaving: false,
    error: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetchDoc(slug)
      .then(({ content }) =>
        setState((prev) => ({ ...prev, markdownText: content, isLoading: false })),
      )
      .catch((err: Error) =>
        setState((prev) => ({ ...prev, isLoading: false, error: err.message })),
      );
  }, [slug]);

  const setMarkdownText = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, markdownText: text }));

      if (!slug) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isSaving: true }));
        updateDoc(slug, text)
          .then(() => setState((prev) => ({ ...prev, isSaving: false })))
          .catch((err: Error) =>
            setState((prev) => ({ ...prev, isSaving: false, error: err.message })),
          );
      }, DEBOUNCE_MS);
    },
    [slug],
  );

  const toggleMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: prev.mode === 'editor' ? 'preview' : 'editor',
    }));
  }, []);

  const onSave = useCallback(async () => {
    if (state.markdownText.length === 0) return;

    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const { slug: newSlug } = await saveDoc(state.markdownText);
      window.location.replace(`/mreader/d/${newSlug}`);
    } catch (err) {
      setState((prev) => ({ ...prev, isSaving: false, error: (err as Error).message }));
    }
  }, [state.markdownText]);

  return { ...state, setMarkdownText, toggleMode, onSave };
}
