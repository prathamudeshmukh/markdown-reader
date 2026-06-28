import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreviewTheme } from './usePreviewTheme';
import * as telemetry from '../telemetry';

const STORAGE_KEY = 'openmark:preview-theme';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(telemetry, 'track').mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePreviewTheme', () => {
  it('returns default when localStorage has no entry', () => {
    const { result } = renderHook(() => usePreviewTheme());
    expect(result.current[0]).toBe('default');
  });

  it('returns the stored valid theme ID', () => {
    localStorage.setItem(STORAGE_KEY, 'dracula');
    const { result } = renderHook(() => usePreviewTheme());
    expect(result.current[0]).toBe('dracula');
  });

  it('falls back to default for an unrecognised stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'neon-garbage');
    const { result } = renderHook(() => usePreviewTheme());
    expect(result.current[0]).toBe('default');
  });

  it('setTheme updates the current theme', () => {
    const { result } = renderHook(() => usePreviewTheme());
    act(() => { result.current[1]('dracula'); });
    expect(result.current[0]).toBe('dracula');
  });

  it('setTheme writes the new value to localStorage', () => {
    const { result } = renderHook(() => usePreviewTheme());
    act(() => { result.current[1]('github'); });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('github');
  });

  it('setTheme emits theme_changed telemetry with the correct theme_id', () => {
    const { result } = renderHook(() => usePreviewTheme());
    act(() => { result.current[1]('notion'); });
    expect(telemetry.track).toHaveBeenCalledWith('theme_changed', { theme_id: 'notion' });
  });
});
