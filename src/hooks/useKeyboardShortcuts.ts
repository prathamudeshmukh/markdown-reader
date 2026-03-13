import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave: () => void;
  onToggleMode: () => void;
  onCopyLink: () => void;
}

export function useKeyboardShortcuts({ onSave, onToggleMode, onCopyLink }: ShortcutHandlers) {
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
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onToggleMode, onCopyLink]);
}
