import { useState, useCallback } from 'react';
import { useMarkdownState } from './hooks/useMarkdownState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import RecentDocsSidebar from './components/RecentDocsSidebar';
import QrModal from './components/QrModal';
import { readRecentDocs } from './utils/recentDocs';
import { getContentLengthBucket, track, type InteractionSource } from './telemetry';

export default function App() {
  const { markdownText, slug, mode, isLoading, isSaving, error, presenceCount, setMarkdownText, toggleMode, onSave } =
    useMarkdownState();

  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

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

  const recentDocs = readRecentDocs();

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 pt-16">
      <Header
        slug={slug}
        mode={mode}
        isSaving={isSaving}
        isLoading={isLoading}
        markdownText={markdownText}
        presenceCount={presenceCount}
        copied={copied}
        copiedMarkdown={copiedMarkdown}
        sidebarOpen={sidebarOpen}
        onCopyLink={() => {
          void copyLink('button');
        }}
        onCopyMarkdown={() => {
          void copyMarkdown();
        }}
        onToggle={() => toggleMode('button')}
        onSave={() => {
          void onSave('button');
        }}
        onNewDoc={() => { window.location.href = '/mreader/'; }}
        onExportPdf={handleExportPdf}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onShowQr={openQr}
      />

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <RecentDocsSidebar
        docs={recentDocs}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDocOpen={() => track('recent_doc_opened', { source: 'sidebar' })}
      />
      {qrOpen && <QrModal url={window.location.href} onClose={() => setQrOpen(false)} />}

      <main className="flex-1 flex flex-col overflow-hidden">
        {mode === 'editor' ? (
          <div className="flex-1 flex flex-col items-center overflow-hidden">
            <div className="w-full max-w-3xl flex-1 flex flex-col">
              <Editor value={markdownText} onChange={setMarkdownText} />
            </div>
          </div>
        ) : (
          <Preview content={markdownText} />
        )}
      </main>
    </div>
  );
}
