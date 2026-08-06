import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseRealtimeClient';
import type { Comment } from '../types/comments';

export interface RealtimeDocSyncResult {
  broadcastContent: (content: string) => void;
  broadcastCommentAdded: (comment: Comment) => void;
  broadcastCommentUpdated: (comment: Comment) => void;
  broadcastCommentDeleted: (id: string) => void;
  subscribeContent: (handler: (content: string) => void) => () => void;
  subscribeCommentAdded: (handler: (comment: Comment) => void) => () => void;
  subscribeCommentUpdated: (handler: (comment: Comment) => void) => () => void;
  subscribeCommentDeleted: (handler: (id: string) => void) => () => void;
  presenceCount: number;
}

function useHandlerSet<T extends (...args: never[]) => void>() {
  const handlersRef = useRef(new Set<T>());

  const subscribe = useCallback((handler: T) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const emit = useCallback((...args: Parameters<T>) => {
    handlersRef.current.forEach((handler) => handler(...args));
  }, []);

  // subscribe/emit are stable for the component's lifetime, but the object
  // literal wrapping them is not — without memoizing it here, every render
  // hands the channel-setup effect below a new identity for content/
  // commentAdded/commentUpdated/commentDeleted, so the effect (which lists
  // them as deps) tears down and rejoins the realtime channel on every
  // render, not just when slug changes. That rejoin churn is what caused the
  // presence pill to flicker on load.
  return useMemo(() => ({ subscribe, emit }), [subscribe, emit]);
}

// One channel per doc slug, constructed once regardless of how many hooks need
// it. Consumers register their own handlers via subscribeContent/subscribeComment*
// in their own effects — no callbacks are threaded in at construction time, so
// there's no ordering dependency between this hook and whatever calls it.
export function useRealtimeDocSync(slug: string | null): RealtimeDocSyncResult {
  const [presenceCount, setPresenceCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Stable per-tab key so a socket rejoin (heartbeat blip, tab wake) reuses the
  // same presence entry instead of the server minting a new one, which briefly
  // double-counted a single editor and made the presence pill flicker.
  const presenceKeyRef = useRef(crypto.randomUUID());

  const content = useHandlerSet<(content: string) => void>();
  const commentAdded = useHandlerSet<(comment: Comment) => void>();
  const commentUpdated = useHandlerSet<(comment: Comment) => void>();
  const commentDeleted = useHandlerSet<(id: string) => void>();

  useEffect(() => {
    if (!slug) return;

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`doc:${slug}`, { config: { presence: { key: presenceKeyRef.current } } })
      .on('broadcast', { event: 'content' }, (msg: { payload: { content: string } }) => {
        content.emit(msg.payload.content);
      })
      .on('broadcast', { event: 'comment_added' }, (msg: { payload: { comment: Comment } }) => {
        commentAdded.emit(msg.payload.comment);
      })
      .on('broadcast', { event: 'comment_updated' }, (msg: { payload: { comment: Comment } }) => {
        commentUpdated.emit(msg.payload.comment);
      })
      .on('broadcast', { event: 'comment_deleted' }, (msg: { payload: { id: string } }) => {
        commentDeleted.emit(msg.payload.id);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceCount(Object.keys(state).length);
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({});
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [slug, content, commentAdded, commentUpdated, commentDeleted]);

  const broadcastContent = useCallback((text: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'content', payload: { content: text } });
  }, []);

  const broadcastCommentAdded = useCallback((comment: Comment) => {
    channelRef.current?.send({ type: 'broadcast', event: 'comment_added', payload: { comment } });
  }, []);

  const broadcastCommentUpdated = useCallback((comment: Comment) => {
    channelRef.current?.send({ type: 'broadcast', event: 'comment_updated', payload: { comment } });
  }, []);

  const broadcastCommentDeleted = useCallback((id: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'comment_deleted', payload: { id } });
  }, []);

  return useMemo(
    () => ({
      broadcastContent,
      broadcastCommentAdded,
      broadcastCommentUpdated,
      broadcastCommentDeleted,
      subscribeContent: content.subscribe,
      subscribeCommentAdded: commentAdded.subscribe,
      subscribeCommentUpdated: commentUpdated.subscribe,
      subscribeCommentDeleted: commentDeleted.subscribe,
      presenceCount,
    }),
    [
      broadcastContent,
      broadcastCommentAdded,
      broadcastCommentUpdated,
      broadcastCommentDeleted,
      content,
      commentAdded,
      commentUpdated,
      commentDeleted,
      presenceCount,
    ],
  );
}
