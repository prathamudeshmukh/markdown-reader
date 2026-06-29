import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseRealtimeClient';
import type { Comment } from '../types/comments';

export interface UseDocChannelOptions {
  onRemoteContent: (content: string) => void;
  onCommentAdded?: (comment: Comment) => void;
  onCommentUpdated?: (comment: Comment) => void;
  onCommentDeleted?: (id: string) => void;
}

export interface DocChannelResult {
  broadcastContent: (content: string) => void;
  broadcastCommentAdded: (comment: Comment) => void;
  broadcastCommentUpdated: (comment: Comment) => void;
  broadcastCommentDeleted: (id: string) => void;
  presenceCount: number;
}

export function useDocChannel(
  slug: string | null,
  opts: UseDocChannelOptions,
): DocChannelResult {
  const [presenceCount, setPresenceCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const onRemoteContentRef = useRef(opts.onRemoteContent);
  onRemoteContentRef.current = opts.onRemoteContent;

  const onCommentAddedRef = useRef(opts.onCommentAdded);
  onCommentAddedRef.current = opts.onCommentAdded;

  const onCommentUpdatedRef = useRef(opts.onCommentUpdated);
  onCommentUpdatedRef.current = opts.onCommentUpdated;

  const onCommentDeletedRef = useRef(opts.onCommentDeleted);
  onCommentDeletedRef.current = opts.onCommentDeleted;

  useEffect(() => {
    if (!slug) return;

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`doc:${slug}`)
      .on('broadcast', { event: 'content' }, (msg: { payload: { content: string } }) => {
        onRemoteContentRef.current(msg.payload.content);
      })
      .on('broadcast', { event: 'comment_added' }, (msg: { payload: { comment: Comment } }) => {
        onCommentAddedRef.current?.(msg.payload.comment);
      })
      .on('broadcast', { event: 'comment_updated' }, (msg: { payload: { comment: Comment } }) => {
        onCommentUpdatedRef.current?.(msg.payload.comment);
      })
      .on('broadcast', { event: 'comment_deleted' }, (msg: { payload: { id: string } }) => {
        onCommentDeletedRef.current?.(msg.payload.id);
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
  }, [slug]);

  const broadcastContent = useCallback((content: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'content', payload: { content } });
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

  return { broadcastContent, broadcastCommentAdded, broadcastCommentUpdated, broadcastCommentDeleted, presenceCount };
}
