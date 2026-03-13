import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseRealtimeClient';

export interface UseDocChannelOptions {
  onRemoteContent: (content: string) => void;
}

export interface DocChannelResult {
  broadcastContent: (content: string) => void;
  presenceCount: number;
}

export function useDocChannel(
  slug: string | null,
  opts: UseDocChannelOptions,
): DocChannelResult {
  const [presenceCount, setPresenceCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Keep the latest callback in a ref so the channel handler is never stale
  // without needing to resubscribe on every render.
  const onRemoteContentRef = useRef(opts.onRemoteContent);
  onRemoteContentRef.current = opts.onRemoteContent;

  useEffect(() => {
    if (!slug) return;

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      // Silently skip real-time when env vars are missing (e.g. in tests / CI
      // without .env.local). The app still works — just no collaboration.
      return;
    }

    const channel = supabase
      .channel(`doc:${slug}`)
      .on('broadcast', { event: 'content' }, (msg: { payload: { content: string } }) => {
        onRemoteContentRef.current(msg.payload.content);
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

  const broadcastContent = useCallback(
    (content: string) => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.send({ type: 'broadcast', event: 'content', payload: { content } });
    },
    [],
  );

  return { broadcastContent, presenceCount };
}
