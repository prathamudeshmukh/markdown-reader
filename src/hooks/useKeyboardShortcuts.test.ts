import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function makeHandlers() {
  return {
    onSave: vi.fn(),
    onToggleMode: vi.fn(),
    onCopyLink: vi.fn(),
    onNewDoc: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onOpenShortcutHelp: vi.fn(),
  };
}

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...modifiers }));
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ctrl+S / Cmd+S → onSave', () => {
    it('calls onSave on Ctrl+S', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('s', { ctrlKey: true });
      expect(handlers.onSave).toHaveBeenCalledOnce();
    });

    it('calls onSave on Cmd+S (metaKey)', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('s', { metaKey: true });
      expect(handlers.onSave).toHaveBeenCalledOnce();
    });

    it('does not call onSave without modifier', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('s');
      expect(handlers.onSave).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+P / Cmd+P → onToggleMode', () => {
    it('calls onToggleMode on Ctrl+P', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('p', { ctrlKey: true });
      expect(handlers.onToggleMode).toHaveBeenCalledOnce();
    });

    it('calls onToggleMode on Cmd+P (metaKey)', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('p', { metaKey: true });
      expect(handlers.onToggleMode).toHaveBeenCalledOnce();
    });

    it('does not call onToggleMode without modifier', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('p');
      expect(handlers.onToggleMode).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+Shift+C → onCopyLink', () => {
    it('calls onCopyLink on Ctrl+Shift+C (uppercase C)', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('C', { ctrlKey: true, shiftKey: true });
      expect(handlers.onCopyLink).toHaveBeenCalledOnce();
    });

    it('calls onCopyLink on Ctrl+Shift+c (lowercase c)', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('c', { ctrlKey: true, shiftKey: true });
      expect(handlers.onCopyLink).toHaveBeenCalledOnce();
    });

    it('does not call onCopyLink without Ctrl', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('C', { shiftKey: true });
      expect(handlers.onCopyLink).not.toHaveBeenCalled();
    });

    it('does not call onCopyLink without Shift', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('c', { ctrlKey: true });
      expect(handlers.onCopyLink).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+Shift+N → onNewDoc', () => {
    it('calls onNewDoc on Ctrl+Shift+N', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('n', { ctrlKey: true, shiftKey: true });
      expect(handlers.onNewDoc).toHaveBeenCalledOnce();
    });

    it('calls onNewDoc on Cmd+Shift+N (metaKey)', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('n', { metaKey: true, shiftKey: true });
      expect(handlers.onNewDoc).toHaveBeenCalledOnce();
    });

    it('does not call onNewDoc without Shift', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('n', { ctrlKey: true });
      expect(handlers.onNewDoc).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+K → onOpenCommandPalette', () => {
    it('calls onOpenCommandPalette on Ctrl+K', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('k', { ctrlKey: true });
      expect(handlers.onOpenCommandPalette).toHaveBeenCalledOnce();
    });

    it('calls onOpenCommandPalette on Cmd+K (metaKey)', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('k', { metaKey: true });
      expect(handlers.onOpenCommandPalette).toHaveBeenCalledOnce();
    });

    it('does not call onOpenCommandPalette without modifier', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('k');
      expect(handlers.onOpenCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('? → onOpenShortcutHelp', () => {
    it('calls onOpenShortcutHelp when ? is pressed on body', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('?');
      expect(handlers.onOpenShortcutHelp).toHaveBeenCalledOnce();
    });

    it('does not call onOpenShortcutHelp when focused on a textarea', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      fireKey('?');
      expect(handlers.onOpenShortcutHelp).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    it('does not call onOpenShortcutHelp when focused on an input', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      fireKey('?');
      expect(handlers.onOpenShortcutHelp).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('does not call onOpenShortcutHelp when Ctrl is held', () => {
      const handlers = makeHandlers();
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('?', { ctrlKey: true });
      expect(handlers.onOpenShortcutHelp).not.toHaveBeenCalled();
    });
  });

  it('removes event listener on unmount', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('does not fire other handlers for unrelated keys', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireKey('x', { ctrlKey: true });
    expect(handlers.onSave).not.toHaveBeenCalled();
    expect(handlers.onToggleMode).not.toHaveBeenCalled();
    expect(handlers.onCopyLink).not.toHaveBeenCalled();
    expect(handlers.onNewDoc).not.toHaveBeenCalled();
    expect(handlers.onOpenCommandPalette).not.toHaveBeenCalled();
    expect(handlers.onOpenShortcutHelp).not.toHaveBeenCalled();
  });
});
