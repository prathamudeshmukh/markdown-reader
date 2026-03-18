import { useRef } from 'react';
import PresenceIndicator from './PresenceIndicator';

export interface DocumentState {
  slug: string | null;
  markdownText: string;
  presenceCount: number;
}

export interface UiState {
  mode: 'editor' | 'preview';
  isSaving: boolean;
  isLoading: boolean;
  copied: boolean;
  copiedMarkdown: boolean;
  sidebarOpen: boolean;
  isPdfImporting: boolean;
}

export interface HeaderActions {
  onToggle: () => void;
  onSave: () => void;
  onNewDoc: () => void;
  onExportPdf: () => void;
  onCopyLink: () => void;
  onCopyMarkdown: () => void;
  onToggleSidebar: () => void;
  onShowQr: () => void;
  onImportPdf: (file: File) => void;
}

interface HeaderProps {
  document: DocumentState;
  ui: UiState;
  actions: HeaderActions;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function Header({ document: { slug, markdownText, presenceCount }, ui: { mode, isSaving, isLoading, copied, copiedMarkdown, sidebarOpen, isPdfImporting }, actions: { onToggle, onSave, onNewDoc, onExportPdf, onCopyLink, onCopyMarkdown, onToggleSidebar, onShowQr, onImportPdf } }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImportPdf(file);
    e.target.value = '';
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
        <div className="flex items-center gap-1.5">
          {/* Sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
          >
            {/* Recent docs / history icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          <div className="flex justify-center">
            {isLoading ? (
              <span className="flex items-center gap-1.5 sm:px-3 py-1 text-xs text-blue-600 dark:text-blue-400">
                <Spinner />
                <span className="hidden sm:inline">Loading…</span>
              </span>
            ) : slug ? (
              <span className="flex items-center gap-1.5 sm:px-3 py-1 text-xs text-gray-400 dark:text-gray-500">
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
            onClick={onCopyLink}
            title="Copy link"
            aria-label="Copy link"
            disabled={slug === null}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </button>
          <button
            onClick={onCopyMarkdown}
            title="Copy markdown"
            aria-label="Copy markdown"
            disabled={markdownText.length === 0}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
          >
            {copiedMarkdown ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            onClick={onShowQr}
            title="Show QR code"
            aria-label="Show QR code"
            disabled={slug === null}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" />
              <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" />
              <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
              <line x1="14" y1="14" x2="14.01" y2="14" strokeWidth="2.5" />
              <line x1="17" y1="14" x2="17.01" y2="14" strokeWidth="2.5" />
              <line x1="20" y1="14" x2="20.01" y2="14" strokeWidth="2.5" />
              <line x1="14" y1="17" x2="14.01" y2="17" strokeWidth="2.5" />
              <line x1="17" y1="17" x2="20" y2="17" />
              <line x1="20" y1="17" x2="20.01" y2="17" strokeWidth="2.5" />
              <line x1="14" y1="20" x2="14.01" y2="20" strokeWidth="2.5" />
              <line x1="17" y1="20" x2="17.01" y2="20" strokeWidth="2.5" />
              <line x1="20" y1="20" x2="20.01" y2="20" strokeWidth="2.5" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleFileChange}
          />
          <div className="relative group">
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Import PDF"
              disabled={isPdfImporting}
              className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
            >
              {isPdfImporting ? (
                <Spinner />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-48">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 text-center leading-snug dark:bg-gray-700">
                Import PDF
                <p className="mt-1 text-gray-400 dark:text-gray-300">Tables may not convert correctly</p>
              </div>
              <div className="mx-auto mt-0.5 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -translate-y-1" />
            </div>
          </div>
          <button
            onClick={onExportPdf}
            title="Export as PDF"
            aria-label="Export as PDF"
            disabled={markdownText.length === 0}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={onNewDoc}
            title="New doc"
            aria-label="New doc"
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
            aria-label={mode === 'editor' ? 'Show Preview' : 'Show Editor'}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
          >
            {mode === 'editor' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
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
