import { useEffect, useRef } from 'react';
import type { RecentDoc } from '../utils/recentDocs';

interface RecentDocsDropdownProps {
  docs: RecentDoc[];
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

export default function RecentDocsDropdown({ docs, onClose }: RecentDocsDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full mt-2 right-0 w-56 max-h-72 overflow-y-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-lg rounded-2xl py-2 z-50"
    >
      <p className="px-3 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        Recent Docs
      </p>
      {docs.length === 0 ? (
        <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          No saved docs yet
        </p>
      ) : (
        docs.map((doc) => (
          <button
            key={doc.slug}
            onClick={() => {
              window.location.href = `/mreader/d/${doc.slug}`;
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="font-mono text-xs text-gray-800 dark:text-gray-200 truncate">
              {doc.slug}
            </span>
            <time
              dateTime={doc.savedAt}
              className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap"
            >
              {formatDate(doc.savedAt)}
            </time>
          </button>
        ))
      )}
    </div>
  );
}
