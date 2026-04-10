import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave: () => void;
  onToggleMode: () => void;
  onCopyLink: () => void;
  onNewDoc: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutHelp: () => void;
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts({
  onSave,
  onToggleMode,
  onCopyLink,
  onNewDoc,
  onOpenCommandPalette,
  onOpenShortcutHelp,
}: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      if (mod && e.key === 'p') {
        e.preventDefault();
        onToggleMode();
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onCopyLink();
        return;
      }

      // Ctrl+Shift+N — new doc (avoids Ctrl+N browser new-window conflict)
      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewDoc();
        return;
      }

      // Ctrl+K / Cmd+K — command palette
      if (mod && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      // ? — shortcut help (skip when user is typing)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        onOpenShortcutHelp();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onToggleMode, onCopyLink, onNewDoc, onOpenCommandPalette, onOpenShortcutHelp]);
}
