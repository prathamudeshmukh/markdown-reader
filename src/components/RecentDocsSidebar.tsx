import { useEffect } from 'react';
import type { DisplayDoc } from '../hooks/useRecentDocs';
import { SIDEBAR_BACKDROP_COLOR } from './sidebar.constants';
import MobileSheetChrome from './MobileSheetChrome';

interface RecentDocsSidebarProps {
  docs: DisplayDoc[];
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
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          data-testid="mobile-backdrop"
          className="sm:hidden fixed inset-0 z-30"
          style={{ backgroundColor: SIDEBAR_BACKDROP_COLOR }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel — bottom sheet on mobile, right panel on desktop */}
      <aside
        className={[
          'fixed inset-x-0 z-40',
          'bottom-[calc(56px+env(safe-area-inset-bottom))] max-h-[72vh] rounded-t-2xl',
          'sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:w-56 sm:pt-[57px] sm:max-h-none sm:rounded-none',
          'flex flex-col overflow-hidden',
          'transition-transform duration-200 ease-in-out',
          isOpen
            ? 'translate-y-0 sm:translate-x-0 sm:translate-y-0'
            : 'translate-y-full sm:translate-x-full sm:translate-y-0',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
        }}
        aria-label="Recent docs"
      >
        <MobileSheetChrome />

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
          <ul className="py-1 overflow-y-auto flex-1">
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
                  {doc.title ? (
                    <>
                      <span className="text-xs font-medium truncate w-full">
                        {doc.title}
                      </span>
                      <span
                        className="font-mono text-[10px] truncate w-full"
                        style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}
                      >
                        {doc.slug}
                      </span>
                    </>
                  ) : (
                    <span
                      className="font-mono text-xs truncate w-full"
                      style={{ fontFamily: '"IBM Plex Mono", monospace' }}
                    >
                      {doc.slug}
                    </span>
                  )}
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
