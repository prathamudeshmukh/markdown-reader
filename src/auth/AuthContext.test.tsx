import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

type AuthChangeHandler = (event: AuthChangeEvent, session: Session | null) => void;

interface MockAuth {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signInWithOtp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
}

let mockAuth: MockAuth;
let mockAuthStateCallback: AuthChangeHandler | null = null;
let shouldThrow = false;

vi.mock('../realtime/supabaseRealtimeClient', () => ({
  getSupabaseClient: () => {
    if (shouldThrow) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    return { auth: mockAuth };
  },
}));

import { AuthProvider, useAuth } from './AuthContext';

function makeMockAuth(): MockAuth {
  mockAuthStateCallback = null;
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn((cb: AuthChangeHandler) => {
      mockAuthStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    shouldThrow = false;
    mockAuth = makeMockAuth();
  });

  it('starts with null user and isAuthLoading true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthLoading).toBe(true);
  });

  it('sets isAuthLoading false after session resolves', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));
  });

  it('hydrates user from existing session', async () => {
    const mockUser = { id: '123', email: 'test@example.com' } as User;
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
  });

  it('sets user to null when no session exists', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('updates user on SIGNED_IN event', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));

    const mockUser = { id: '456', email: 'user@example.com' } as User;
    act(() => {
      mockAuthStateCallback?.('SIGNED_IN', { user: mockUser } as Session);
    });
    expect(result.current.user).toEqual(mockUser);
  });

  it('clears user on SIGNED_OUT event', async () => {
    const mockUser = { id: '123', email: 'test@example.com' } as User;
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    act(() => {
      mockAuthStateCallback?.('SIGNED_OUT', null);
    });
    expect(result.current.user).toBeNull();
  });

  it('signInWithEmail calls signInWithOtp with the email and redirectTo', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));

    await act(async () => {
      await result.current.signInWithEmail('test@example.com');
    });

    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { emailRedirectTo: window.location.href },
    });
  });

  it('signInWithEmail returns null error on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));

    let returnValue: { error: string | null } | undefined;
    await act(async () => {
      returnValue = await result.current.signInWithEmail('test@example.com');
    });
    expect(returnValue).toEqual({ error: null });
  });

  it('signInWithEmail returns error message on failure', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: { message: 'Invalid email' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));

    let returnValue: { error: string | null } | undefined;
    await act(async () => {
      returnValue = await result.current.signInWithEmail('bad@example.com');
    });
    expect(returnValue).toEqual({ error: 'Invalid email' });
  });

  it('signOut calls supabase.auth.signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));

    act(() => {
      result.current.signOut();
    });
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('unsubscribes from auth state changes on unmount', async () => {
    const mockUnsubscribe = vi.fn();
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(mockAuth.getSession).toHaveBeenCalled());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('no-ops gracefully when env vars are missing', async () => {
    shouldThrow = true;
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });
});
