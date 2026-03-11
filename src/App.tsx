import { useMarkdownState } from './hooks/useMarkdownState';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';

export default function App() {
  const { markdownText, mode, decodeError, isContentLarge, setMarkdownText, toggleMode } =
    useMarkdownState();

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 pt-16">
      <Header mode={mode} onToggle={toggleMode} />

      {decodeError && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
          Invalid content found in URL. Opened in editor mode.
        </div>
      )}

      {isContentLarge && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 text-sm text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300">
          Content may be too large for reliable URL sharing.
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
