import { useState, useCallback, useEffect, useRef } from 'react';
import { getInitialMarkdownText } from '../utils/onboarding';
import { getSlugFromPath } from '../utils/route';
import { fetchDoc, saveDoc, updateDoc } from '../api/docsApi';
import { addRecentDoc } from '../utils/recentDocs';
import { useDocChannel } from '../realtime/useDocChannel';
import { getContentLengthBucket, getErrorType, track, type InteractionSource } from '../telemetry';
import { saveCreatorToken, loadCreatorToken, clearCreatorToken } from '../utils/creatorTokens';

type Mode = 'editor' | 'preview';

interface MarkdownState {
  markdownText: string;
  title: string | null;
  docUserId: string | null;
  mode: Mode;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  presenceCount: number;
}

const DEBOUNCE_MS = 250;

function getCollectionIdFromQuery(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('collection');
}

export function useMarkdownState({ userId }: { userId?: string } = {}) {
  const [slug, setSlug] = useState<string | null>(() => getSlugFromPath());
  const [collectionId, setCollectionId] = useState<string | null>(() =>
    slug ? null : getCollectionIdFromQuery(),
  );

  const [state, setState] = useState<MarkdownState>(() => {
    if (slug !== null) {
      return {
        markdownText: '',
        title: null,
        docUserId: null,
        mode: 'preview',
        isLoading: true,
        isSaving: false,
        error: null,
        presenceCount: 0,
      };
    }
    const forked = sessionStorage.getItem('mreader:fork');
    if (forked) {
      sessionStorage.removeItem('mreader:fork');
      return {
        markdownText: forked,
        title: null,
        docUserId: null,
        mode: 'editor',
        isLoading: false,
        isSaving: false,
        error: null,
        presenceCount: 0,
      };
    }
    return {
      markdownText: getInitialMarkdownText(true),
      title: null,
      docUserId: null,
      mode: 'editor',
      isLoading: false,
      isSaving: false,
      error: null,
      presenceCount: 0,
    };
  });

  const handleRemoteContent = useCallback((content: string) => {
    setState((prev) => ({ ...prev, markdownText: content }));
  }, []);

  const { broadcastContent, presenceCount } = useDocChannel(slug, {
    onRemoteContent: handleRemoteContent,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedLocallyRef = useRef(false);
  const userIdRef = useRef<string | undefined>(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  useEffect(() => {
    track('app_opened', {
      entry: slug ? 'existing_doc' : 'new_doc',
      has_slug: slug !== null,
    });
  }, [slug]);

  useEffect(() => {
    if (!slug || savedLocallyRef.current) return;

    // Auth is not required here: the Worker's GET handler uses the service role
    // key and bypasses RLS entirely — the slug itself is the capability token.
    // Write operations (updateDoc/saveDoc) still enforce ownership via RLS.
    fetchDoc(slug)
      .then((doc) => {
        addRecentDoc(slug, doc.title);
        track('doc_opened', {
          has_slug: true,
          content_length_bucket: getContentLengthBucket(doc.content),
        });
        setState((prev) => ({ ...prev, markdownText: doc.content, title: doc.title, docUserId: doc.user_id, isLoading: false }));
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
        // Read userId from ref so we always get the value current at execution
        // time, not the stale value captured when setMarkdownText was created.
        const currentUserId = userIdRef.current;
        setState((prev) => {
          const creatorToken = currentUserId && !prev.docUserId ? loadCreatorToken(slug) : null;
          const isClaim = !!creatorToken;

          updateDoc(slug, {
            content: text,
            ...(isClaim ? { claim: true, creatorToken } : {}),
          })
            .then(() => {
              if (isClaim && creatorToken) {
                clearCreatorToken(slug);
                setState((s) => ({ ...s, isSaving: false, docUserId: currentUserId ?? null }));
              } else {
                setState((s) => ({ ...s, isSaving: false }));
              }
            })
            .catch((err: Error) =>
              setState((s) => ({ ...s, isSaving: false, error: err.message })),
            );

          return { ...prev, isSaving: true };
        });
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

  const navigateToDoc = useCallback((newSlug: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    savedLocallyRef.current = false;
    history.pushState({}, '', `/mreader/d/${newSlug}`);
    setSlug(newSlug);
    setCollectionId(null);
    setState({
      markdownText: '',
      title: null,
      docUserId: null,
      mode: 'preview',
      isLoading: true,
      isSaving: false,
      error: null,
      presenceCount: 0,
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
      const { slug: newSlug, creatorToken } = await saveDoc({
        content: state.markdownText,
        title: state.title ?? undefined,
        collectionId,
      });
      saveCreatorToken(newSlug, creatorToken);
      addRecentDoc(newSlug, state.title);
      track('doc_save_succeeded', { slug_created: true });
      history.pushState({}, '', `/mreader/d/${newSlug}`);
      savedLocallyRef.current = true;
      setSlug(newSlug);
      setCollectionId(null);
      setState((prev) => ({ ...prev, isSaving: false }));
    } catch (err) {
      track('doc_save_failed', { error_type: getErrorType(err) });
      setState((prev) => ({ ...prev, isSaving: false, error: (err as Error).message }));
    }
  }, [state.markdownText, state.title, collectionId]);

  return { ...state, slug, collectionId, presenceCount, setMarkdownText, setTitle, toggleMode, onSave, navigateToDoc };
}
