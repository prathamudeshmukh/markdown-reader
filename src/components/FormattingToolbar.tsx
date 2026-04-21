import { useState, useEffect, useRef, useCallback } from 'react';
import {
  applyBold,
  applyItalic,
  applyCode,
  applyHeading,
  applyQuote,
  applyList,
  applyLink,
  applyTable,
  type InsertionResult,
} from '../utils/markdownInsertion';
import { track } from '../telemetry';
import type { ToolbarAction } from '../telemetry/types';

const TOOL_BTN =
  'flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150 ' +
  'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] ' +
  'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]';

interface FormattingToolbarProps {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  mode: 'editor' | 'preview';
  readOnly: boolean;
  value: string;
  onTextChange: (value: string) => void;
}

export default function FormattingToolbar({
  editorRef,
  mode,
  readOnly,
  value,
  onTextChange,
}: FormattingToolbarProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const [hoverRows, setHoverRows] = useState(2);
  const [hoverCols, setHoverCols] = useState(2);
  const tableRef = useRef<HTMLDivElement>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const linkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableOpen) return;
    function handleClick(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setTableOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [tableOpen]);

  useEffect(() => {
    if (!linkOpen) return;
    function handleClick(e: MouseEvent) {
      if (linkRef.current && !linkRef.current.contains(e.target as Node)) {
        setLinkOpen(false);
        setLinkText('');
        setLinkUrl('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [linkOpen]);

  const applyInsertion = useCallback(
    (result: InsertionResult) => {
      onTextChange(result.newValue);
      requestAnimationFrame(() => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        editorRef.current.setSelectionRange(result.newCursorStart, result.newCursorEnd);
      });
    },
    [onTextChange, editorRef],
  );

  function getSelection() {
    const el = editorRef.current;
    if (!el) return { start: 0, end: 0 };
    return { start: el.selectionStart, end: el.selectionEnd };
  }

  function handleAction(action: ToolbarAction) {
    if (!editorRef.current) return;
    const { start, end } = getSelection();
    const hadSelection = start !== end;

    track('toolbar_action', { action, had_selection: hadSelection });

    switch (action) {
      case 'bold':
        applyInsertion(applyBold(value, start, end));
        break;
      case 'italic':
        applyInsertion(applyItalic(value, start, end));
        break;
      case 'code':
        applyInsertion(applyCode(value, start, end));
        break;
      case 'heading':
        applyInsertion(applyHeading(value, start, end));
        break;
      case 'quote':
        applyInsertion(applyQuote(value, start, end));
        break;
      case 'list':
        applyInsertion(applyList(value, start, end));
        break;
      case 'link':
        if (hadSelection) {
          applyInsertion(applyLink(value, start, end));
        } else {
          setLinkText('');
          setLinkUrl('');
          setLinkOpen(true);
        }
        break;
      case 'table':
        setTableOpen((v) => !v);
        break;
    }
  }

  function handleTableInsert(rows: number, cols: number) {
    const { start } = getSelection();
    track('toolbar_action', { action: 'table', had_selection: false });
    applyInsertion(applyTable(value, start, rows, cols));
    setTableOpen(false);
  }

  function handleLinkInsert(e: React.FormEvent) {
    e.preventDefault();
    const { start, end } = getSelection();
    applyInsertion(applyLink(value, start, end, linkText, linkUrl));
    setLinkOpen(false);
    setLinkText('');
    setLinkUrl('');
  }

  const isEditor = mode === 'editor';

  return (
    <div
      className="hidden sm:flex justify-center px-4 pt-2 pb-1"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        role="toolbar"
        aria-label="Formatting toolbar"
        className="flex items-center gap-0.5 rounded-full px-2 py-1 transition-opacity duration-150"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.10), 0 0 0 0.5px var(--border)',
          opacity: isEditor ? 1 : 0,
          pointerEvents: isEditor ? 'auto' : 'none',
        }}
      >
      {/* Bold */}
      <button
        type="button"
        onClick={() => handleAction('bold')}
        disabled={readOnly}
        aria-label="Bold"
        title="Bold"
        className={TOOL_BTN}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => handleAction('italic')}
        disabled={readOnly}
        aria-label="Italic"
        title="Italic"
        className={TOOL_BTN}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>

      {/* Inline code */}
      <button
        type="button"
        onClick={() => handleAction('code')}
        disabled={readOnly}
        aria-label="Inline code"
        title="Inline code"
        className={TOOL_BTN}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      <div className="w-px h-4 mx-0.5 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

      {/* Heading */}
      <button
        type="button"
        onClick={() => handleAction('heading')}
        disabled={readOnly}
        aria-label="Heading"
        title="Heading (##)"
        className={`${TOOL_BTN} font-bold text-xs`}
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        H
      </button>

      {/* Blockquote */}
      <button
        type="button"
        onClick={() => handleAction('quote')}
        disabled={readOnly}
        aria-label="Blockquote"
        title="Blockquote"
        className={TOOL_BTN}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </svg>
      </button>

      {/* Unordered list */}
      <button
        type="button"
        onClick={() => handleAction('list')}
        disabled={readOnly}
        aria-label="Unordered list"
        title="Unordered list"
        className={TOOL_BTN}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      <div className="w-px h-4 mx-0.5 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

      {/* Link */}
      <div ref={linkRef} className="relative">
        <button
          type="button"
          onClick={() => handleAction('link')}
          disabled={readOnly}
          aria-label="Link"
          title="Insert link"
          className={`${TOOL_BTN} ${linkOpen ? '!text-[var(--accent)]' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>

        {linkOpen && (
          <div
            data-testid="link-popover"
            className="absolute left-0 top-full mt-2 w-64 rounded-xl p-3 shadow-xl z-50 animate-fade-in"
            style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
          >
            <form onSubmit={handleLinkInsert} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                autoFocus
                className="w-full px-2 py-1 text-xs rounded-md outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="url"
                placeholder="https://"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded-md outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1 text-xs font-medium rounded-md transition-colors"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => { setLinkOpen(false); setLinkText(''); setLinkUrl(''); }}
                  className="flex-1 py-1 text-xs font-medium rounded-md transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Table */}
      <div ref={tableRef} className="relative">
        <button
          type="button"
          onClick={() => handleAction('table')}
          disabled={readOnly}
          aria-label="Insert table"
          title="Insert table"
          className={`${TOOL_BTN} ${tableOpen ? '!text-[var(--accent)]' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>

        {tableOpen && (
          <div
            data-testid="table-popover"
            className="absolute left-0 top-full mt-2 rounded-xl p-3 shadow-xl z-50 animate-fade-in"
            style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
          >
            <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {hoverRows} × {hoverCols}
            </p>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(6, 1.25rem)' }}>
              {Array.from({ length: 6 }, (_, rowIdx) =>
                Array.from({ length: 6 }, (_, colIdx) => {
                  const row = rowIdx + 1;
                  const col = colIdx + 1;
                  const active = row <= hoverRows && col <= hoverCols;
                  return (
                    <div
                      key={`${row}-${col}`}
                      className="w-5 h-5 rounded-sm cursor-pointer transition-colors"
                      style={{
                        backgroundColor: active ? 'var(--accent)' : 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        opacity: active ? 0.85 : 1,
                      }}
                      onMouseEnter={() => { setHoverRows(row); setHoverCols(col); }}
                      onClick={() => handleTableInsert(row, col)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
