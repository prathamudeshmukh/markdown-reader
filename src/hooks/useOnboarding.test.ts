import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  markSampleDocShown,
  dismissTooltip,
  readOnboardingData,
  ONBOARDING_KEY,
  type OnboardingData,
} from '../utils/onboarding';

vi.mock('../utils/onboarding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/onboarding')>();
  return {
    ...actual,
    markSampleDocShown: vi.fn(actual.markSampleDocShown),
    dismissTooltip: vi.fn(actual.dismissTooltip),
  };
});

import { useOnboarding } from './useOnboarding';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useOnboarding — isNewDoc: false', () => {
  it('tooltipsVisible stays all false even after 1.5s', () => {
    const { result } = renderHook(() => useOnboarding(false));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.tooltipsVisible).toEqual({
      copyLink: false,
      qrCode: false,
      sidebar: false,
    });
  });

  it('does not call markSampleDocShown when isNewDoc is false', () => {
    renderHook(() => useOnboarding(false));
    act(() => vi.advanceTimersByTime(100));
    expect(markSampleDocShown).not.toHaveBeenCalled();
  });
});

describe('useOnboarding — isNewDoc: true, first visit (key absent)', () => {
  it('shows only the first tooltip (copyLink) after 1.5s', () => {
    const { result } = renderHook(() => useOnboarding(true));
    expect(result.current.tooltipsVisible).toEqual({
      copyLink: false,
      qrCode: false,
      sidebar: false,
    });
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.tooltipsVisible).toEqual({
      copyLink: true,
      qrCode: false,
      sidebar: false,
    });
  });

  it('calls markSampleDocShown on mount', () => {
    renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(0));
    expect(markSampleDocShown).toHaveBeenCalledOnce();
  });
});

describe('useOnboarding — isNewDoc: true, copyLink already dismissed', () => {
  beforeEach(() => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: true, qrCode: false, sidebar: false },
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
  });

  it('shows qrCode (first undismissed) after 1.5s', () => {
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.tooltipsVisible.copyLink).toBe(false);
    expect(result.current.tooltipsVisible.qrCode).toBe(true);
    expect(result.current.tooltipsVisible.sidebar).toBe(false);
  });
});

describe('useOnboarding — isNewDoc: true, all tooltips already dismissed', () => {
  beforeEach(() => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: true, qrCode: true, sidebar: true },
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
  });

  it('tooltipsVisible stays all false', () => {
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.tooltipsVisible).toEqual({
      copyLink: false,
      qrCode: false,
      sidebar: false,
    });
  });
});

describe('useOnboarding — sequential advance after dismiss', () => {
  it('shows qrCode after copyLink is dismissed (after 400ms advance)', () => {
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.tooltipsVisible.copyLink).toBe(true);

    act(() => result.current.dismissTooltip('copyLink'));
    expect(result.current.tooltipsVisible.copyLink).toBe(false);

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.tooltipsVisible.qrCode).toBe(true);
    expect(result.current.tooltipsVisible.copyLink).toBe(false);
    expect(result.current.tooltipsVisible.sidebar).toBe(false);
  });

  it('persists dismissal to localStorage', () => {
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.dismissTooltip('copyLink'));
    expect(dismissTooltip).toHaveBeenCalledWith('copyLink');
    const data = readOnboardingData();
    expect(data?.tooltips.copyLink).toBe(true);
  });

  it('shows no next tooltip after the last one is dismissed', () => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: true, qrCode: true, sidebar: false },
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));

    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.tooltipsVisible.sidebar).toBe(true);

    act(() => result.current.dismissTooltip('sidebar'));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.tooltipsVisible).toEqual({
      copyLink: false,
      qrCode: false,
      sidebar: false,
    });
  });
});

describe('useOnboarding — interaction callbacks', () => {
  it('onCopyLinkInteraction dismisses copyLink tooltip', () => {
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.onCopyLinkInteraction());
    expect(result.current.tooltipsVisible.copyLink).toBe(false);
  });

  it('onQrInteraction dismisses qrCode tooltip when it is active', () => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: true, qrCode: false, sidebar: false },
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.tooltipsVisible.qrCode).toBe(true);
    act(() => result.current.onQrInteraction());
    expect(result.current.tooltipsVisible.qrCode).toBe(false);
  });

  it('onSidebarInteraction dismisses sidebar tooltip when it is active', () => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: true, qrCode: true, sidebar: false },
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    const { result } = renderHook(() => useOnboarding(true));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.tooltipsVisible.sidebar).toBe(true);
    act(() => result.current.onSidebarInteraction());
    expect(result.current.tooltipsVisible.sidebar).toBe(false);
  });
});

describe('useOnboarding — cleanup', () => {
  it('clears initial timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = renderHook(() => useOnboarding(true));
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
