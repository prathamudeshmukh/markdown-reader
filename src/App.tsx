import { useMarkdownState } from './hooks/useMarkdownState';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';

export default function App() {
  const { markdownText, slug, mode, isLoading, isSaving, error, setMarkdownText, toggleMode, onSave } =
    useMarkdownState();

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 pt-16">
      <Header
        slug={slug}
        mode={mode}
        isSaving={isSaving}
        markdownText={markdownText}
        onToggle={toggleMode}
        onSave={onSave}
      />

      {isLoading && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
          Loading document…
        </div>
      )}

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
