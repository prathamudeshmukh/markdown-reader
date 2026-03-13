import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Supabase mock setup -------------------------------------------------------

type BroadcastHandler = (payload: { payload: { content: string } }) => void;
type PresenceHandler = (state: Record<string, unknown[]>) => void;
type SubscribeCallback = (status: string) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  presenceState: ReturnType<typeof vi.fn>;
  _triggerBroadcast: (content: string) => void;
  _triggerPresenceSync: (state: Record<string, unknown[]>) => void;
}

let mockChannel: MockChannel;

vi.mock('./supabaseRealtimeClient', () => ({
  getSupabaseClient: () => ({
    channel: (_name: string) => mockChannel,
  }),
}));

function makeMockChannel(): MockChannel {
  let broadcastHandler: BroadcastHandler | null = null;
  let presenceHandler: PresenceHandler | null = null;
  let subscribeCallback: SubscribeCallback | null = null;

  const channel: MockChannel = {
    on: vi.fn((type: string, opts: { event: string }, handler: unknown) => {
      if (type === 'broadcast' && opts.event === 'content') {
        broadcastHandler = handler as BroadcastHandler;
      }
      if (type === 'presence' && opts.event === 'sync') {
        presenceHandler = handler as PresenceHandler;
      }
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
    _triggerBroadcast: (content: string) => {
      broadcastHandler?.({ payload: { content } });
    },
    _triggerPresenceSync: (state: Record<string, unknown[]>) => {
      channel.presenceState.mockReturnValue(state);
      presenceHandler?.(state);
    },
  };
  return channel;
}

// --- Tests --------------------------------------------------------------------

import { useDocChannel } from './useDocChannel';

describe('useDocChannel', () => {
  beforeEach(() => {
    mockChannel = makeMockChannel();
  });

  it('does not subscribe when slug is null', () => {
    const onRemoteContent = vi.fn();
    renderHook(() => useDocChannel(null, { onRemoteContent }));
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to channel when slug is set', () => {
    const onRemoteContent = vi.fn();
    renderHook(() => useDocChannel('abc1234', { onRemoteContent }));
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(mockChannel.track).toHaveBeenCalled();
  });

  it('calls onRemoteContent when broadcast event fires', () => {
    const onRemoteContent = vi.fn();
    renderHook(() => useDocChannel('abc1234', { onRemoteContent }));

    act(() => {
      mockChannel._triggerBroadcast('hello world');
    });

    expect(onRemoteContent).toHaveBeenCalledWith('hello world');
  });

  it('updates presenceCount when presence sync fires', () => {
    const onRemoteContent = vi.fn();
    const { result } = renderHook(() => useDocChannel('abc1234', { onRemoteContent }));

    expect(result.current.presenceCount).toBe(0);

    act(() => {
      mockChannel._triggerPresenceSync({ user1: [{}], user2: [{}] });
    });

    expect(result.current.presenceCount).toBe(2);
  });

  it('unsubscribes on unmount', () => {
    const onRemoteContent = vi.fn();
    const { unmount } = renderHook(() => useDocChannel('abc1234', { onRemoteContent }));
    unmount();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('broadcastContent is a no-op when slug is null', () => {
    const onRemoteContent = vi.fn();
    const { result } = renderHook(() => useDocChannel(null, { onRemoteContent }));
    // Should not throw
    act(() => {
      result.current.broadcastContent('test');
    });
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it('uses latest onRemoteContent without resubscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useDocChannel('abc1234', { onRemoteContent: cb }),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });

    const subscribeCalls = mockChannel.subscribe.mock.calls.length;

    act(() => {
      mockChannel._triggerBroadcast('updated');
    });

    // subscribe called only once (not again after rerender)
    expect(mockChannel.subscribe.mock.calls.length).toBe(subscribeCalls);
    expect(second).toHaveBeenCalledWith('updated');
    expect(first).not.toHaveBeenCalled();
  });
});
