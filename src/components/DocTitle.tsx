interface DocTitleProps {
  title: string | null;
  mode: 'editor' | 'preview';
  onChange: (value: string) => void;
}

export default function DocTitle({ title, mode, onChange }: DocTitleProps) {
  if (mode === 'preview') {
    if (!title) return null;
    return (
      <div className="max-w-2xl mx-auto w-full px-6 sm:px-10 pt-10 pb-0">
        <h1
          className="text-2xl font-bold font-sans"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-8 sm:px-12 pt-10 pb-0">
      <input
        type="text"
        value={title ?? ''}
        placeholder="Untitled"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="w-full bg-transparent outline-none text-2xl font-bold font-sans"
        style={{
          color: 'var(--text-primary)',
          caretColor: 'var(--accent)',
          border: 'none',
        }}
        aria-label="Document title"
      />
    </div>
  );
}
