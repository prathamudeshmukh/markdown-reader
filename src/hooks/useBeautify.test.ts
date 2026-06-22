import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeautify, contentHash } from './useBeautify';

const validResult = {
  theme: 'technical' as const,
  accent: '#6366f1',
  nodes: [{ type: 'hero' as const, title: 'Test' }],
};

vi.mock('../api/beautifyApi', () => ({
  beautifyMarkdown: vi.fn(),
}));

import { beautifyMarkdown } from '../api/beautifyApi';

describe('useBeautify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useBeautify('# Hello'));
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions idle → loading → success on trigger()', async () => {
    vi.mocked(beautifyMarkdown).mockResolvedValueOnce(validResult);
    const { result } = renderHook(() => useBeautify('# Hello'));

    act(() => { result.current.trigger(); });
    expect(result.current.status).toBe('loading');

    await act(async () => {});
    expect(result.current.status).toBe('success');
    expect(result.current.result).toEqual(validResult);
  });

  it('sets error state when API call fails', async () => {
    vi.mocked(beautifyMarkdown).mockRejectedValueOnce(new Error('API error'));
    const { result } = renderHook(() => useBeautify('# Hello'));

    await act(async () => { result.current.trigger(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('API error');
    expect(result.current.result).toBeNull();
  });

  it('trigger() is a no-op when already loading', async () => {
    vi.mocked(beautifyMarkdown).mockResolvedValue(validResult);
    const { result } = renderHook(() => useBeautify('# Hello'));

    act(() => { result.current.trigger(); });
    act(() => { result.current.trigger(); });
    await act(async () => {});

    expect(beautifyMarkdown).toHaveBeenCalledTimes(1);
  });

  it('trigger() is a no-op when content is empty', async () => {
    const { result } = renderHook(() => useBeautify(''));
    await act(async () => { result.current.trigger(); });
    expect(beautifyMarkdown).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('rerun() calls API again bypassing cache', async () => {
    vi.mocked(beautifyMarkdown).mockResolvedValue(validResult);
    const { result } = renderHook(() => useBeautify('# Hello'));

    await act(async () => { result.current.trigger(); });
    expect(result.current.status).toBe('success');

    await act(async () => { result.current.rerun(); });
    expect(beautifyMarkdown).toHaveBeenCalledTimes(2);
  });

  describe('initialResult / initialHash', () => {
    it('starts in success state when initialResult is provided', () => {
      const { result } = renderHook(() =>
        useBeautify('# Hello', { initialResult: validResult, initialHash: contentHash('# Hello') }),
      );
      expect(result.current.status).toBe('success');
      expect(result.current.result).toEqual(validResult);
    });

    it('isStale is false when hashes match', () => {
      const text = '# Hello';
      const { result } = renderHook(() =>
        useBeautify(text, { initialHash: contentHash(text) }),
      );
      expect(result.current.isStale).toBe(false);
    });

    it('isStale is true when hashes differ', () => {
      const { result } = renderHook(() =>
        useBeautify('# Updated content', { initialHash: contentHash('# Original content') }),
      );
      expect(result.current.isStale).toBe(true);
    });

    it('isStale is false when no initialHash is provided', () => {
      const { result } = renderHook(() => useBeautify('# Hello'));
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('onSave callback', () => {
    it('calls onSave with result and hash after successful trigger()', async () => {
      vi.mocked(beautifyMarkdown).mockResolvedValueOnce(validResult);
      const onSave = vi.fn();
      const text = '# Hello';

      const { result } = renderHook(() => useBeautify(text, { onSave }));

      await act(async () => { result.current.trigger(); });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(validResult, contentHash(text));
    });

    it('calls onSave after successful rerun()', async () => {
      vi.mocked(beautifyMarkdown).mockResolvedValue(validResult);
      const onSave = vi.fn();
      const text = '# Hello';

      const { result } = renderHook(() => useBeautify(text, { onSave }));

      await act(async () => { result.current.trigger(); });
      onSave.mockClear();

      await act(async () => { result.current.rerun(); });
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onSave when no onSave option is given', async () => {
      vi.mocked(beautifyMarkdown).mockResolvedValueOnce(validResult);
      const { result } = renderHook(() => useBeautify('# Hello'));

      await act(async () => { result.current.trigger(); });
      // No assertion needed — just verifying no crash when onSave is absent
      expect(result.current.status).toBe('success');
    });

    it('does NOT call onSave when the API call fails', async () => {
      vi.mocked(beautifyMarkdown).mockRejectedValueOnce(new Error('fail'));
      const onSave = vi.fn();

      const { result } = renderHook(() => useBeautify('# Hello', { onSave }));
      await act(async () => { result.current.trigger(); });

      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
