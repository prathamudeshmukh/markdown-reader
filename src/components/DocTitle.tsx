import { useEffect, useRef } from 'react';
import type { PreviewThemeId } from '../themes/previewThemes';

interface DocTitleProps {
  title: string | null;
  mode: 'editor' | 'preview';
  onChange: (value: string) => void;
  theme?: PreviewThemeId;
}

export default function DocTitle({ title, mode, onChange, theme = 'default' }: DocTitleProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [title, mode]);

  if (mode === 'preview') {
    if (!title) return null;
    return (
      <div className="max-w-3xl mx-auto w-full px-3 sm:px-10 pt-10 pb-0" data-preview-theme={theme}>
        <div style={{ display: 'flex', gap: 0 }}>
          <div
            data-testid="title-bar"
            style={{
              width: '3px',
              borderRadius: '2px',
              background: 'var(--accent)',
              flexShrink: 0,
              alignSelf: 'stretch',
              marginRight: '14px',
            }}
          />
          <h1
            className="text-lg sm:text-2xl doc-title-preview"
            style={{
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              margin: 0,
              paddingBottom: '1rem',
            }}
          >
            {title}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-12 pt-4 pb-0">
      <div style={{ display: 'flex', gap: 0 }}>
        <div
          data-testid="title-bar"
          style={{
            width: '3px',
            borderRadius: '2px',
            background: 'var(--border)',
            flexShrink: 0,
            alignSelf: 'stretch',
            marginRight: '14px',
            transition: 'background 0.15s ease',
          }}
        />
        <textarea
          ref={textareaRef}
          rows={1}
          value={title ?? ''}
          placeholder="Untitled"
          onChange={(e) => {
            onChange(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
          className="doc-title-input w-full bg-transparent outline-none text-lg sm:text-2xl"
          style={{
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--text-primary)',
            caretColor: 'var(--accent)',
            border: 'none',
            borderRadius: 0,
            paddingBottom: '0.6rem',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            resize: 'none',
            overflow: 'hidden',
          }}
          aria-label="Document title"
        />
      </div>
    </div>
  );
}
