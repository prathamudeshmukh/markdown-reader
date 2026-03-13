import { useState } from 'react';
import RecentDocsDropdown from './RecentDocsDropdown';
import PresenceIndicator from './PresenceIndicator';
import type { RecentDoc } from '../utils/recentDocs';

interface HeaderProps {
  slug: string | null;
  mode: 'editor' | 'preview';
  isSaving: boolean;
  isLoading: boolean;
  markdownText: string;
  recentDocs: RecentDoc[];
  presenceCount: number;
  onToggle: () => void;
  onSave: () => void;
  onNewDoc: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function Header({ slug, mode, isSaving, isLoading, markdownText, recentDocs, presenceCount, onToggle, onSave, onNewDoc }: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <header className="flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-lg shadow-black/5 rounded-full px-3 sm:px-4 py-2 dark:bg-gray-900/80 dark:border-gray-700/60">
        <h1 className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
          <img src="/mreader/logo.png" alt="" className="h-6 w-6" />
          Markdown Reader
        </h1>
        <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700" />
        {slug && presenceCount > 1 && <PresenceIndicator count={presenceCount} />}
        <div className="flex items-center gap-0.5 sm:gap-1.5">
          <div className="flex justify-center">
            {isLoading ? (
              <span className="flex items-center gap-1.5 px-2 sm:px-3 py-1 text-xs text-blue-600 dark:text-blue-400">
                <Spinner />
                <span className="hidden sm:inline">Loading…</span>
              </span>
            ) : slug ? (
              <span className="flex items-center gap-1.5 px-2 sm:px-3 py-1 text-xs text-gray-400 dark:text-gray-500">
                {isSaving && <Spinner />}
                <span className="hidden sm:inline">{isSaving ? 'Saving…' : 'Saved'}</span>
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
          </div>
          <button
            onClick={copyLink}
            title="Copy link"
            disabled={slug === null}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
          >
            {copied ? (
              // Checkmark icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              // Link icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </button>
          <div className="relative">
              <button
                onClick={() => recentDocs.length > 0 && setHistoryOpen((prev) => !prev)}
                title="Recent docs"
                aria-label="Recent docs"
                disabled={recentDocs.length === 0}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
              >
                {/* Clock icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
              {historyOpen && (
                <RecentDocsDropdown
                  docs={recentDocs}
                  onClose={() => setHistoryOpen(false)}
                />
              )}
            </div>
          <button
              onClick={onNewDoc}
              title="New doc"
              disabled={slug === null && markdownText.length === 0}
              className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          <button
            onClick={onToggle}
            title={mode === 'editor' ? 'Show Preview' : 'Show Editor'}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
          >
            {mode === 'editor' ? (
              // Eye icon — switch to preview
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              // Pencil icon — switch to editor
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
          </button>
        </div>
      </header>
    </div>
  );
}
