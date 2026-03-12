import { useMarkdownState } from './hooks/useMarkdownState';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import { readRecentDocs } from './utils/recentDocs';

export default function App() {
  const { markdownText, slug, mode, isLoading, isSaving, error, setMarkdownText, toggleMode, onSave } =
    useMarkdownState();

  const recentDocs = readRecentDocs();

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 pt-16">
      <Header
        slug={slug}
        mode={mode}
        isSaving={isSaving}
        isLoading={isLoading}
        markdownText={markdownText}
        recentDocs={recentDocs}
        onToggle={toggleMode}
        onSave={onSave}
      />

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
          {error}
        </div>
      )}

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
