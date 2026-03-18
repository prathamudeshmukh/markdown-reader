import { useState, useCallback, useEffect, useRef } from 'react';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';
import { addRecentDoc } from '../utils/recentDocs';
import { useDocChannel } from '../realtime/useDocChannel';
import { getContentLengthBucket, getErrorType, track, type InteractionSource } from '../telemetry';

type Mode = 'editor' | 'preview';

interface MarkdownState {
  markdownText: string;
  slug: string | null;
  mode: Mode;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  presenceCount: number;
}

const DEBOUNCE_MS = 250;

export function useMarkdownState() {
  const slug = getSlugFromPath();

  const [state, setState] = useState<MarkdownState>({
    markdownText: '',
    slug,
    mode: slug !== null ? 'preview' : 'editor',
    isLoading: slug !== null,
    isSaving: false,
    error: null,
    presenceCount: 0,
  });

  const handleRemoteContent = useCallback((content: string) => {
    setState((prev) => ({ ...prev, markdownText: content }));
  }, []);

  const { broadcastContent, presenceCount } = useDocChannel(slug, {
    onRemoteContent: handleRemoteContent,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    track('app_opened', {
      entry: slug ? 'existing_doc' : 'new_doc',
      has_slug: slug !== null,
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    fetchDoc(slug)
      .then(({ content }) => {
        addRecentDoc(slug);
        track('doc_opened', {
          has_slug: true,
          content_length_bucket: getContentLengthBucket(content),
        });
        setState((prev) => ({ ...prev, markdownText: content, isLoading: false }));
      })
      .catch((err: Error) =>
        setState((prev) => ({ ...prev, isLoading: false, error: err.message })),
      );
  }, [slug]);

  const setMarkdownText = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, markdownText: text }));
      broadcastContent(text);

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
    [slug, broadcastContent],
  );

  const toggleMode = useCallback((source: InteractionSource = 'button') => {
    setState((prev) => {
      const nextMode = prev.mode === 'editor' ? 'preview' : 'editor';
      track('mode_toggled', {
        from_mode: prev.mode,
        to_mode: nextMode,
        source,
      });
      return { ...prev, mode: nextMode };
    });
  }, []);

  const onSave = useCallback(async (source: InteractionSource = 'button') => {
    if (state.markdownText.length === 0) return;

    track('doc_save_clicked', {
      content_length_bucket: getContentLengthBucket(state.markdownText),
      source,
    });

    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const { slug: newSlug } = await saveDoc(state.markdownText);
      addRecentDoc(newSlug);
      track('doc_save_succeeded', { slug_created: true });
      window.location.replace(`/mreader/d/${newSlug}`);
    } catch (err) {
      track('doc_save_failed', { error_type: getErrorType(err) });
      setState((prev) => ({ ...prev, isSaving: false, error: (err as Error).message }));
    }
  }, [state.markdownText]);

  return { ...state, presenceCount, setMarkdownText, toggleMode, onSave };
}
