import type { RecentDoc } from '../utils/recentDocs';

interface RecentDocsSidebarProps {
  docs: RecentDoc[];
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function RecentDocsSidebar({ docs, isOpen, onClose }: RecentDocsSidebarProps) {
  return (
    <>
      {/* Backdrop — dismisses sidebar on click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel — always fixed, slides over content on all screen sizes */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-56 pt-16',
          'flex flex-col border-r border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-900 overflow-y-auto',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Recent docs"
      >
        <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Recent Docs
          </p>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {docs.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
            No saved docs yet
          </p>
        ) : (
          <ul className="py-1">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <button
                  onClick={() => { window.location.href = `/mreader/d/${doc.slug}`; }}
                  className="w-full flex flex-col gap-0.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200 truncate w-full">
                    {doc.slug}
                  </span>
                  <time
                    dateTime={doc.savedAt}
                    className="text-[10px] text-gray-400 dark:text-gray-500"
                  >
                    {formatDate(doc.savedAt)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
