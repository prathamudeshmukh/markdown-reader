interface HeaderProps {
  slug: string | null;
  mode: 'editor' | 'preview';
  isSaving: boolean;
  markdownText: string;
  onToggle: () => void;
  onSave: () => void;
}

export default function Header({ slug, mode, isSaving, markdownText, onToggle, onSave }: HeaderProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <header className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-lg shadow-black/5 rounded-full px-4 py-2 dark:bg-gray-900/80 dark:border-gray-700/60">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
          Markdown Reader
        </h1>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-1.5">
          {slug ? (
            <span className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500">
              {isSaving ? 'Saving…' : 'Saved'}
            </span>
          ) : (
            <button
              onClick={onSave}
              disabled={markdownText.length === 0 || isSaving}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
            >
              Save
            </button>
          )}
          <button
            onClick={onToggle}
            className="px-3 py-1 text-xs bg-gray-900 text-white hover:bg-gray-700 rounded-full transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {mode === 'editor' ? 'Show Preview' : 'Show Editor'}
          </button>
        </div>
      </header>
    </div>
  );
}
