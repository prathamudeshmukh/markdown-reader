import { forwardRef } from 'react';
import MarkdownDropZone from './MarkdownDropZone';

export type EditorHandle = HTMLTextAreaElement;

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  onDropFile?: (file: File) => void;
  onDropRejected?: () => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, onChange, readOnly, onDropFile, onDropRejected },
  ref,
) {
  return (
    <MarkdownDropZone
      onFile={onDropFile ?? (() => {})}
      onRejected={onDropRejected ?? (() => {})}
    >
      <div
        className="flex-1 flex flex-col items-center overflow-hidden animate-mode-enter"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <textarea
          ref={ref}
          className="editor-textarea flex-1 w-full max-w-3xl px-3 sm:px-12 pt-4 pb-24 font-mono text-sm resize-none outline-none leading-8 tracking-wide"
          style={{
            backgroundColor: 'transparent',
            color: readOnly ? 'var(--text-muted)' : 'var(--text-primary)',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
          }}
          value={value}
          onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder="Start writing…"
          spellCheck={false}
          autoFocus={!readOnly}
        />
      </div>
    </MarkdownDropZone>
  );
});

export default Editor;
