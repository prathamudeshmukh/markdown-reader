import { useState, useEffect, useRef, useMemo } from 'react';

interface Command {
  id: string;
  label: string;
  group: 'Documents' | 'Actions';
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteActions {
  onNewDoc: () => void;
  onToggleMode: () => void;
  onSave: () => void;
  onCopyLink: () => void;
  onCopyMarkdown: () => void;
  onShowQr: () => void;
  onDownloadMarkdown: () => void;
  onExportPdf: () => void;
  onToggleSidebar: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenShortcutHelp: () => void;
  onNavigateToDoc: (slug: string) => void;
}

interface RecentDoc {
  slug: string;
  title: string | null;
}

interface CommandPaletteProps {
  onClose: () => void;
  isAuthenticated: boolean;
  recentDocs: RecentDoc[];
  currentSlug: string | null;
  actions: CommandPaletteActions;
}

function matchesQuery(command: Command, query: string): boolean {
  if (!query) return true;
  return command.label.toLowerCase().includes(query.toLowerCase());
}

function buildStaticCommands(
  actions: CommandPaletteActions,
  isAuthenticated: boolean,
  onClose: () => void,
): Command[] {
  const wrap = (fn: () => void) => () => { fn(); onClose(); };

  const commands: Command[] = [
    { id: 'new-doc', label: 'New document', group: 'Actions', shortcut: 'Ctrl+Shift+N', action: wrap(actions.onNewDoc) },
    { id: 'toggle-mode', label: 'Toggle editor / preview', group: 'Actions', shortcut: 'Ctrl+P', action: wrap(actions.onToggleMode) },
    { id: 'save', label: 'Save document', group: 'Actions', shortcut: 'Ctrl+S', action: wrap(actions.onSave) },
    { id: 'copy-link', label: 'Copy share link', group: 'Actions', shortcut: 'Ctrl+Shift+C', action: wrap(actions.onCopyLink) },
    { id: 'copy-markdown', label: 'Copy markdown', group: 'Actions', action: wrap(actions.onCopyMarkdown) },
    { id: 'show-qr', label: 'Show QR code', group: 'Actions', action: wrap(actions.onShowQr) },
    { id: 'download-md', label: 'Download as Markdown', group: 'Actions', action: wrap(actions.onDownloadMarkdown) },
    { id: 'export-pdf', label: 'Export as PDF', group: 'Actions', action: wrap(actions.onExportPdf) },
    { id: 'toggle-sidebar', label: 'Toggle sidebar', group: 'Actions', action: wrap(actions.onToggleSidebar) },
    { id: 'shortcut-help', label: 'Show keyboard shortcuts', group: 'Actions', shortcut: '?', action: wrap(actions.onOpenShortcutHelp) },
  ];

  if (isAuthenticated) {
    commands.push({ id: 'sign-out', label: 'Sign out', group: 'Actions', action: wrap(actions.onSignOut) });
  } else {
    commands.push({ id: 'sign-in', label: 'Sign in', group: 'Actions', action: wrap(actions.onSignIn) });
  }

  return commands;
}

function buildDocCommands(
  recentDocs: RecentDoc[],
  currentSlug: string | null,
  onNavigateToDoc: (slug: string) => void,
  onClose: () => void,
): Command[] {
  return recentDocs
    .filter((doc) => doc.slug !== currentSlug)
    .map((doc) => ({
      id: `doc-${doc.slug}`,
      label: doc.title ?? doc.slug,
      group: 'Documents' as const,
      action: () => { onNavigateToDoc(doc.slug); onClose(); },
    }));
}

const GROUP_ORDER: Command['group'][] = ['Documents', 'Actions'];

export default function CommandPalette({
  onClose,
  isAuthenticated,
  recentDocs,
  currentSlug,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allCommands = useMemo(
    () => [
      ...buildDocCommands(recentDocs, currentSlug, actions.onNavigateToDoc, onClose),
      ...buildStaticCommands(actions, isAuthenticated, onClose),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated, recentDocs, currentSlug],
  );

  const filteredCommands = useMemo(
    () => allCommands.filter((cmd) => matchesQuery(cmd, query)),
    [allCommands, query],
  );

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view (scrollIntoView may be unavailable in test environments)
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filteredCommands.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      filteredCommands[activeIndex]?.action();
    }
  }

  // Group filtered commands for display
  const grouped = useMemo(() => {
    return GROUP_ORDER.flatMap((group) => {
      const cmds = filteredCommands.filter((c) => c.group === group);
      return cmds.length > 0 ? [{ group, cmds }] : [];
    });
  }, [filteredCommands]);

  // Flat index offset per group for activeIndex tracking
  const flatIndex = (group: Command['group'], indexInGroup: number): number => {
    let offset = 0;
    for (const g of GROUP_ORDER) {
      if (g === group) return offset + indexInGroup;
      offset += filteredCommands.filter((c) => c.group === g).length;
    }
    return indexInGroup;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      data-testid="command-palette-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="text"
            placeholder="Search commands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Search commands"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="flex items-center justify-center w-4 h-4 rounded"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
          {filteredCommands.length === 0 ? (
            <p
              className="px-4 py-6 text-sm text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No commands found
            </p>
          ) : (
            grouped.map(({ group, cmds }) => (
              <div key={group}>
                <p
                  className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {group}
                </p>
                {cmds.map((cmd, indexInGroup) => {
                  const fi = flatIndex(group, indexInGroup);
                  const isActive = fi === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      data-active={isActive}
                      onClick={cmd.action}
                      onMouseEnter={() => setActiveIndex(fi)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors"
                      style={{
                        backgroundColor: isActive ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <span className="flex items-center gap-1 shrink-0 ml-4">
                          {cmd.shortcut.split('+').map((key, i) => (
                            <kbd
                              key={i}
                              className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono rounded"
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                                minWidth: '1.5rem',
                              }}
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-3 px-3.5 py-2 text-[11px]"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
