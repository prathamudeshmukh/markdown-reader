import type { RecentDoc } from '../utils/recentDocs';

interface RecentDocsSidebarProps {
  docs: RecentDoc[];
  isOpen: boolean;
  onClose: () => void;
  onDocOpen?: () => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function RecentDocsSidebar({ docs, isOpen, onClose, onDocOpen }: RecentDocsSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-56 pt-16',
          'flex flex-col overflow-y-auto',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
        }}
        aria-label="Recent docs"
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest font-display"
            style={{ color: 'var(--text-muted)' }}
          >
            Recent Docs
          </p>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {docs.length === 0 ? (
          <p
            className="px-4 py-5 text-xs text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            No saved docs yet
          </p>
        ) : (
          <ul className="py-1">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <button
                  onClick={() => {
                    onDocOpen?.();
                    window.location.href = `/mreader/d/${doc.slug}`;
                  }}
                  className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    className="font-mono text-xs truncate w-full"
                    style={{ fontFamily: '"IBM Plex Mono", monospace' }}
                  >
                    {doc.slug}
                  </span>
                  <time
                    dateTime={doc.savedAt}
                    className="text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
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
