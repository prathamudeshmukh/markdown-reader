import { useState, useCallback, useEffect } from 'react';
import { useMarkdownState } from './hooks/useMarkdownState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRecentDocs } from './hooks/useRecentDocs';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import RecentDocsSidebar from './components/RecentDocsSidebar';
import DocTitle from './components/DocTitle';
import QrModal from './components/QrModal';
import EmailSignInModal from './components/EmailSignInModal';
import { useAuth } from './auth/AuthContext';
import { getContentLengthBucket, track, type InteractionSource } from './telemetry';
import { pdfToMarkdown, PdfImportError } from './utils/pdfToMarkdown';
import { pdfFileToMarkdown, PdfApiError } from './utils/pdfApiClient';
import { readFeatureFlags } from './config/features';

const FEATURES = readFeatureFlags();

const PDF_IMPORT_UNKNOWN_ERROR = 'Failed to import PDF. Please try again.';

export default function App() {
  const { markdownText, title, slug, mode, isLoading, isSaving, error, presenceCount, setMarkdownText, setTitle, toggleMode, onSave } =
    useMarkdownState();
  const { user, isAuthLoading, signInWithEmail, signOut } = useAuth();

  const [signInOpen, setSignInOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [isPdfImporting, setIsPdfImporting] = useState(false);
  const [pdfImportProgress, setPdfImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfImportError, setPdfImportError] = useState<string | null>(null);
  const [pdfImportWarning, setPdfImportWarning] = useState(false);

  useEffect(() => {
    if (!pdfImportError) return;
    const id = setTimeout(() => setPdfImportError(null), 5000);
    return () => clearTimeout(id);
  }, [pdfImportError]);

  useEffect(() => {
    if (!pdfImportWarning) return;
    const id = setTimeout(() => setPdfImportWarning(false), 8000);
    return () => clearTimeout(id);
  }, [pdfImportWarning]);

  const handleImportPdf = useCallback(
    async (file: File) => {
      setIsPdfImporting(true);
      setPdfImportProgress(null);
      setPdfImportError(null);
      try {
        const result = FEATURES.usePdfApi
          ? await pdfFileToMarkdown(file)
          : await pdfToMarkdown(file, {
              onProgress: (current, total) => setPdfImportProgress({ current, total }),
            });
        setMarkdownText(result.markdown);
        if (mode === 'editor') toggleMode('button');
        setPdfImportWarning(true);
        track('pdf_imported', {
          page_count: result.pageCount,
          content_length_bucket: getContentLengthBucket(result.markdown),
        });
      } catch (err) {
        const message =
          err instanceof PdfApiError || err instanceof PdfImportError
            ? err.userMessage
            : PDF_IMPORT_UNKNOWN_ERROR;
        setPdfImportError(message);
      } finally {
        setIsPdfImporting(false);
        setPdfImportProgress(null);
      }
    },
    [setMarkdownText, mode, toggleMode],
  );

  const openQr = useCallback(() => {
    track('qr_opened', { has_slug: slug !== null });
    setQrOpen(true);
  }, [slug]);

  const copyLink = useCallback(async (source: InteractionSource = 'button') => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      track('link_copied', { has_slug: slug !== null, source });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures (e.g. unsupported browsers).
    }
  }, [slug]);

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      track('markdown_copied', {
        content_length_bucket: getContentLengthBucket(markdownText),
      });
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      // Ignore clipboard failures (e.g. unsupported browsers).
    }
  }, [markdownText]);

  useKeyboardShortcuts({
    onSave: () => {
      void onSave('shortcut');
    },
    onToggleMode: () => toggleMode('shortcut'),
    onCopyLink: () => {
      void copyLink('shortcut');
    },
  });

  function handleDownloadMarkdown() {
    track('markdown_downloaded', { content_length_bucket: getContentLengthBucket(markdownText) });
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = slug ? `${title ?? slug}.md` : 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    track('pdf_exported', { mode_at_export: mode });
    if (mode === 'editor') {
      toggleMode('button');
      // Wait for re-render before printing
      setTimeout(() => window.print(), 100);
    } else {
      window.print();
    }
  }

  const recentDocsState = useRecentDocs();
  const recentDocs = recentDocsState.status === 'ready' ? recentDocsState.docs : [];

  return (
    <div className="h-full flex flex-col pt-16" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header
        document={{ slug, markdownText, presenceCount }}
        ui={{ mode, isSaving, isLoading, copied, copiedMarkdown, sidebarOpen, isPdfImporting }}
        actions={{
          onToggle: () => toggleMode('button'),
          onSave: () => { void onSave('button'); },
          onNewDoc: () => { window.location.href = '/mreader/'; },
          onExportPdf: handleExportPdf,
          onDownloadMarkdown: handleDownloadMarkdown,
          onCopyLink: () => { void copyLink('button'); },
          onCopyMarkdown: () => { void copyMarkdown(); },
          onToggleSidebar: () => setSidebarOpen((prev) => !prev),
          onShowQr: openQr,
          onImportPdf: handleImportPdf,
        }}
        auth={{ user, isAuthLoading }}
        authActions={{ onSignInClick: () => setSignInOpen(true), onSignOut: signOut }}
      />

      {error && (
        <div className="px-4 py-2 text-sm" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#991b1b' }}>
          {error}
        </div>
      )}
      {pdfImportError && (
        <div className="px-4 py-2 text-sm" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#991b1b' }}>
          {pdfImportError}
        </div>
      )}

      {/* PDF toasts — fixed bottom-center, no layout shift */}
      {isPdfImporting && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 animate-slide-up">
          <div
            className="toast-glass flex items-center gap-2.5 rounded-full px-4 py-2 text-sm shadow-lg"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <svg className="animate-spin h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="flex-1 sm:flex-none">
              {pdfImportProgress
                ? `Importing PDF… page ${pdfImportProgress.current} of ${pdfImportProgress.total}`
                : 'Reading PDF…'}
            </span>
            {pdfImportProgress && (
              <div className="flex-1 sm:w-20 sm:flex-none h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(pdfImportProgress.current / pdfImportProgress.total) * 100}%`,
                    backgroundColor: 'var(--accent)',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {pdfImportWarning && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 animate-slide-up">
          <div
            className="toast-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm shadow-lg"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            PDF imported — tables may not have converted correctly, please review.
          </div>
        </div>
      )}

      {signInOpen && (
        <EmailSignInModal
          onClose={() => setSignInOpen(false)}
          onSubmit={signInWithEmail}
        />
      )}

      <RecentDocsSidebar
        docs={recentDocs}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDocOpen={() => track('recent_doc_opened', { source: 'sidebar' })}
      />
      {qrOpen && <QrModal url={window.location.href} onClose={() => setQrOpen(false)} />}

      <DocTitle title={title} mode={mode} onChange={setTitle} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {mode === 'editor' ? (
          <Editor value={markdownText} onChange={setMarkdownText} />
        ) : (
          <Preview content={markdownText} />
        )}
      </main>
    </div>
  );
}
