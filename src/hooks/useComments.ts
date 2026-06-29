import { useState, useEffect, useCallback } from 'react';
import {
  fetchComments,
  postComment,
  resolveComment as apiResolveComment,
  deleteComment as apiDeleteComment,
} from '../api/commentsApi';
import type { Comment, CreateCommentInput } from '../types/comments';

interface CommentsState {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
}

interface UseCommentsResult {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  addComment: (input: CreateCommentInput) => Promise<Comment | null>;
  toggleResolve: (id: string, resolved: boolean) => Promise<void>;
  removeComment: (id: string, jwt: string) => Promise<void>;
  unresolvedCount: number;
  setComments: React.Dispatch<React.SetStateAction<CommentsState>>;
}

function buildOptimisticComment(input: CreateCommentInput, slug: string): Comment {
  return {
    id: `optimistic-${Date.now()}`,
    docSlug: slug,
    userId: null,
    authorName: input.authorName || 'Anonymous',
    content: input.content,
    anchorText: input.anchorText,
    resolved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function useComments(slug: string | null): UseCommentsResult {
  const [state, setState] = useState<CommentsState>({
    comments: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!slug) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    fetchComments(slug)
      .then((comments) => setState({ comments, isLoading: false, error: null }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load comments';
        setState({ comments: [], isLoading: false, error: message });
      });
  }, [slug]);

  const addComment = useCallback(
    async (input: CreateCommentInput): Promise<Comment | null> => {
      if (!slug) return null;

      const optimistic = buildOptimisticComment(input, slug);
      setState((prev) => ({
        ...prev,
        comments: [...prev.comments, optimistic],
        error: null,
      }));

      try {
        const created = await postComment(slug, input);
        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) => (c.id === optimistic.id ? created : c)),
        }));
        return created;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to post comment';
        setState((prev) => ({
          ...prev,
          comments: prev.comments.filter((c) => c.id !== optimistic.id),
          error: message,
        }));
        return null;
      }
    },
    [slug],
  );

  const toggleResolve = useCallback(
    async (id: string, resolved: boolean): Promise<void> => {
      if (!slug) return;

      setState((prev) => ({
        ...prev,
        comments: prev.comments.map((c) => (c.id === id ? { ...c, resolved } : c)),
        error: null,
      }));

      try {
        const updated = await apiResolveComment(slug, id, resolved);
        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) => (c.id === id ? updated : c)),
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update comment';
        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) => (c.id === id ? { ...c, resolved: !resolved } : c)),
          error: message,
        }));
      }
    },
    [slug],
  );

  const removeComment = useCallback(
    async (id: string, jwt: string): Promise<void> => {
      if (!slug) return;

      const backup = state.comments.find((c) => c.id === id);
      setState((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== id),
        error: null,
      }));

      try {
        await apiDeleteComment(slug, id, jwt);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete comment';
        setState((prev) => ({
          ...prev,
          comments: backup ? [...prev.comments, backup] : prev.comments,
          error: message,
        }));
      }
    },
    [slug, state.comments],
  );

  const unresolvedCount = state.comments.filter((c) => !c.resolved).length;

  return {
    comments: state.comments,
    isLoading: state.isLoading,
    error: state.error,
    addComment,
    toggleResolve,
    removeComment,
    unresolvedCount,
    setComments: setState,
  };
}
