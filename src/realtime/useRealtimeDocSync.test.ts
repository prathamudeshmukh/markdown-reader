import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Comment } from '../types/comments';

// --- Supabase mock setup -------------------------------------------------------

type BroadcastHandler<T> = (payload: { payload: T }) => void;
type PresenceHandler = (state: Record<string, unknown[]>) => void;
type SubscribeCallback = (status: string) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  presenceState: ReturnType<typeof vi.fn>;
  _triggerContent: (content: string) => void;
  _triggerCommentAdded: (comment: Comment) => void;
  _triggerCommentUpdated: (comment: Comment) => void;
  _triggerCommentDeleted: (id: string) => void;
  _triggerPresenceSync: (state: Record<string, unknown[]>) => void;
}

let mockChannel: MockChannel;

vi.mock('./supabaseRealtimeClient', () => ({
  getSupabaseClient: () => ({
    channel: (_name: string) => mockChannel,
  }),
}));

function makeMockChannel(): MockChannel {
  let contentHandler: BroadcastHandler<{ content: string }> | null = null;
  let commentAddedHandler: BroadcastHandler<{ comment: Comment }> | null = null;
  let commentUpdatedHandler: BroadcastHandler<{ comment: Comment }> | null = null;
  let commentDeletedHandler: BroadcastHandler<{ id: string }> | null = null;
  let presenceHandler: PresenceHandler | null = null;
  let subscribeCallback: SubscribeCallback | null = null;

  const channel: MockChannel = {
    on: vi.fn((type: string, opts: { event: string }, handler: unknown) => {
      if (type === 'broadcast' && opts.event === 'content') contentHandler = handler as BroadcastHandler<{ content: string }>;
      if (type === 'broadcast' && opts.event === 'comment_added') commentAddedHandler = handler as BroadcastHandler<{ comment: Comment }>;
      if (type === 'broadcast' && opts.event === 'comment_updated') commentUpdatedHandler = handler as BroadcastHandler<{ comment: Comment }>;
      if (type === 'broadcast' && opts.event === 'comment_deleted') commentDeletedHandler = handler as BroadcastHandler<{ id: string }>;
      if (type === 'presence' && opts.event === 'sync') presenceHandler = handler as PresenceHandler;
      return channel;
    }),
    subscribe: vi.fn((cb?: SubscribeCallback) => {
      subscribeCallback = cb ?? null;
      subscribeCallback?.('SUBSCRIBED');
      return channel;
    }),
    track: vi.fn(() => Promise.resolve('ok')),
    unsubscribe: vi.fn(),
    presenceState: vi.fn(() => ({})),
    _triggerContent: (content: string) => {
      contentHandler?.({ payload: { content } });
    },
    _triggerCommentAdded: (comment: Comment) => {
      commentAddedHandler?.({ payload: { comment } });
    },
    _triggerCommentUpdated: (comment: Comment) => {
      commentUpdatedHandler?.({ payload: { comment } });
    },
    _triggerCommentDeleted: (id: string) => {
      commentDeletedHandler?.({ payload: { id } });
    },
    _triggerPresenceSync: (state: Record<string, unknown[]>) => {
      channel.presenceState.mockReturnValue(state);
      presenceHandler?.(state);
    },
  };
  return channel;
}

// --- Tests --------------------------------------------------------------------

import { useRealtimeDocSync } from './useRealtimeDocSync';

const comment: Comment = {
  id: 'c1',
  docSlug: 'abc1234',
  userId: null,
  authorName: 'Anonymous',
  content: 'hi',
  anchorText: null,
  resolved: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useRealtimeDocSync', () => {
  beforeEach(() => {
    mockChannel = makeMockChannel();
  });

  it('does not subscribe when slug is null', () => {
    renderHook(() => useRealtimeDocSync(null));
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to the channel when slug is set', () => {
    renderHook(() => useRealtimeDocSync('abc1234'));
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(mockChannel.track).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeDocSync('abc1234'));
    unmount();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('broadcastContent is a no-op when slug is null', () => {
    const { result } = renderHook(() => useRealtimeDocSync(null));
    act(() => {
      result.current.broadcastContent('test');
    });
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it('updates presenceCount when presence sync fires', () => {
    const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

    expect(result.current.presenceCount).toBe(0);

    act(() => {
      mockChannel._triggerPresenceSync({ user1: [{}], user2: [{}] });
    });

    expect(result.current.presenceCount).toBe(2);
  });

  describe('subscribeContent', () => {
    it('calls a registered handler when a content broadcast fires', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

      act(() => {
        result.current.subscribeContent(handler);
      });
      act(() => {
        mockChannel._triggerContent('hello world');
      });

      expect(handler).toHaveBeenCalledWith('hello world');
    });

    it('stops calling a handler after it unsubscribes', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

      let unsubscribe: () => void = () => undefined;
      act(() => {
        unsubscribe = result.current.subscribeContent(handler);
      });
      act(() => unsubscribe());
      act(() => {
        mockChannel._triggerContent('after unsubscribe');
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('calls every registered handler, supporting multiple subscribers', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

      act(() => {
        result.current.subscribeContent(first);
        result.current.subscribeContent(second);
      });
      act(() => {
        mockChannel._triggerContent('broadcast to all');
      });

      expect(first).toHaveBeenCalledWith('broadcast to all');
      expect(second).toHaveBeenCalledWith('broadcast to all');
    });

    it('does not resubscribe to the channel when a new handler is registered', () => {
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));
      const subscribeCalls = mockChannel.subscribe.mock.calls.length;

      act(() => {
        result.current.subscribeContent(vi.fn());
      });

      expect(mockChannel.subscribe.mock.calls.length).toBe(subscribeCalls);
    });
  });

  describe('subscribeCommentAdded/Updated/Deleted', () => {
    it('calls the registered handler when comment_added fires', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

      act(() => {
        result.current.subscribeCommentAdded(handler);
      });
      act(() => {
        mockChannel._triggerCommentAdded(comment);
      });

      expect(handler).toHaveBeenCalledWith(comment);
    });

    it('calls the registered handler when comment_updated fires', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

      act(() => {
        result.current.subscribeCommentUpdated(handler);
      });
      act(() => {
        mockChannel._triggerCommentUpdated(comment);
      });

      expect(handler).toHaveBeenCalledWith(comment);
    });

    it('calls the registered handler when comment_deleted fires', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));

      act(() => {
        result.current.subscribeCommentDeleted(handler);
      });
      act(() => {
        mockChannel._triggerCommentDeleted('c1');
      });

      expect(handler).toHaveBeenCalledWith('c1');
    });
  });

  describe('broadcast functions', () => {
    it('sends a content broadcast on the channel', () => {
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));
      const channelWithSend = mockChannel as unknown as { send: ReturnType<typeof vi.fn> };
      channelWithSend.send = vi.fn();

      act(() => {
        result.current.broadcastContent('new content');
      });

      expect(channelWithSend.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'content',
        payload: { content: 'new content' },
      });
    });

    it('sends a comment_added broadcast on the channel', () => {
      const { result } = renderHook(() => useRealtimeDocSync('abc1234'));
      const channelWithSend = mockChannel as unknown as { send: ReturnType<typeof vi.fn> };
      channelWithSend.send = vi.fn();

      act(() => {
        result.current.broadcastCommentAdded(comment);
      });

      expect(channelWithSend.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'comment_added',
        payload: { comment },
      });
    });
  });
});
