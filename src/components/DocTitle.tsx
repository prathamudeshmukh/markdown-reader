import { useEffect, useRef } from 'react';

interface DocTitleProps {
  title: string | null;
  mode: 'editor' | 'preview';
  onChange: (value: string) => void;
}

export default function DocTitle({ title, mode, onChange }: DocTitleProps) {
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
      <div className="max-w-3xl mx-auto w-full px-3 sm:px-10 pt-10 pb-0">
        <h1
          className="text-lg sm:text-2xl"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
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
        <div
          style={{
            height: '1px',
            marginBottom: '0.25rem',
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--border) 40%, transparent 100%)',
            opacity: 0.6,
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-12 pt-10 pb-0">
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
          borderBottom: '1.5px solid var(--border)',
          borderRadius: 0,
          paddingBottom: '0.6rem',
          transition: 'border-color 0.15s ease',
          fontFamily: 'Inter, system-ui, sans-serif',
          resize: 'none',
          overflow: 'hidden',
        }}
        aria-label="Document title"
      />
    </div>
  );
}
