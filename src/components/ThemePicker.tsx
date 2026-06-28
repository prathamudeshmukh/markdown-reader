import { useEffect } from 'react';
import { PREVIEW_THEMES, type PreviewThemeId } from '../themes/previewThemes';

interface ThemePickerProps {
  current: PreviewThemeId;
  onSelect: (id: PreviewThemeId) => void;
  onClose: () => void;
}

export default function ThemePicker({ current, onSelect, onClose }: ThemePickerProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="absolute right-0 top-full mt-2 w-44 rounded-xl p-1.5 shadow-xl z-50 animate-fade-in"
      style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
    >
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Preview theme
      </p>
      {PREVIEW_THEMES.map((theme) => {
        const isActive = theme.id === current;
        return (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            data-active={isActive ? 'true' : 'false'}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left rounded-md transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            aria-label={theme.label}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: theme.swatch }}
              aria-hidden="true"
            />
            <span className="flex-1">{theme.label}</span>
            {isActive && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
