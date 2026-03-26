import { useState, useCallback, useEffect, useRef } from 'react';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';
import { addRecentDoc } from '../utils/recentDocs';
import { useDocChannel } from '../realtime/useDocChannel';
import { getContentLengthBucket, getErrorType, track, type InteractionSource } from '../telemetry';

type Mode = 'editor' | 'preview';

interface MarkdownState {
  markdownText: string;
  title: string | null;
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
    title: null,
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
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    track('app_opened', {
      entry: slug ? 'existing_doc' : 'new_doc',
      has_slug: slug !== null,
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    fetchDoc(slug)
      .then((doc) => {
        addRecentDoc(slug, doc.title);
        track('doc_opened', {
          has_slug: true,
          content_length_bucket: getContentLengthBucket(doc.content),
        });
        setState((prev) => ({ ...prev, markdownText: doc.content, title: doc.title, isLoading: false }));
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
        updateDoc(slug, { content: text })
          .then(() => setState((prev) => ({ ...prev, isSaving: false })))
          .catch((err: Error) =>
            setState((prev) => ({ ...prev, isSaving: false, error: err.message })),
          );
      }, DEBOUNCE_MS);
    },
    [slug, broadcastContent],
  );

  const setTitle = useCallback(
    (newTitle: string) => {
      setState((prev) => ({ ...prev, title: newTitle }));

      if (!slug) return;

      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isSaving: true }));
        updateDoc(slug, { title: newTitle })
          .then(() => setState((prev) => ({ ...prev, isSaving: false })))
          .catch((err: Error) =>
            setState((prev) => ({ ...prev, isSaving: false, error: err.message })),
          );
      }, DEBOUNCE_MS);
    },
    [slug],
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
      const { slug: newSlug } = await saveDoc({ content: state.markdownText, title: state.title ?? undefined });
      addRecentDoc(newSlug, state.title);
      track('doc_save_succeeded', { slug_created: true });
      window.location.replace(`/mreader/d/${newSlug}`);
    } catch (err) {
      track('doc_save_failed', { error_type: getErrorType(err) });
      setState((prev) => ({ ...prev, isSaving: false, error: (err as Error).message }));
    }
  }, [state.markdownText, state.title]);

  return { ...state, presenceCount, setMarkdownText, setTitle, toggleMode, onSave };
}
