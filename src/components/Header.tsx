type Mode = 'editor' | 'preview';

interface HeaderProps {
  mode: Mode;
  onToggle: () => void;
}

export default function Header({ mode, onToggle }: HeaderProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {
      // Fallback: select the URL so user can copy manually
      window.prompt('Copy this link:', window.location.href);
    });
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <header className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-lg shadow-black/5 rounded-full px-4 py-2 dark:bg-gray-900/80 dark:border-gray-700/60">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Markdown Reader</h1>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyLink}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
          >
            Copy Link
          </button>
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
