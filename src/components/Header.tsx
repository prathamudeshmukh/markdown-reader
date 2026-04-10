import { useRef, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import PresenceIndicator from './PresenceIndicator';
import UserMenu from './UserMenu';

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
  onDownloadMarkdown: () => void;
  onCopyLink: () => void;
  onCopyMarkdown: () => void;
  onToggleSidebar: () => void;
  onShowQr: () => void;
  onImportPdf: (file: File) => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutHelp?: () => void;
}

export interface AuthState {
  user: User | null;
  isAuthLoading: boolean;
}

export interface AuthActions {
  onSignInClick: () => void;
  onSignOut: () => void;
}

interface HeaderProps {
  document: DocumentState;
  ui: UiState;
  actions: HeaderActions;
  auth: AuthState;
  authActions: AuthActions;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const TOOL_BTN =
  'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ' +
  'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]';

const TOOL_BTN_DISABLED =
  'disabled:opacity-30 disabled:cursor-not-allowed ' +
  'disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]';

function MenuItem({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ color: 'var(--text-primary)' }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-secondary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg px-0.5 py-0.5"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {children}
    </div>
  );
}

export default function Header({
  document: { slug, markdownText, presenceCount },
  ui: { mode, isSaving, isLoading, copied, copiedMarkdown, sidebarOpen, isPdfImporting },
  actions: { onToggle, onSave, onNewDoc, onExportPdf, onDownloadMarkdown, onCopyLink, onCopyMarkdown, onToggleSidebar, onShowQr, onImportPdf, onOpenCommandPalette, onOpenShortcutHelp },
  auth: { user, isAuthLoading },
  authActions: { onSignInClick, onSignOut },
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImportPdf(file);
    e.target.value = '';
  }

  function handleMenuAction(fn: () => void) {
    setMoreOpen(false);
    fn();
  }

  const activeToggleStyle = {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <header
        className="relative surface-glass flex items-center h-14 px-4 sm:px-5"
      >
        {/* ── Brand ──────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <svg width="26" height="26" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="logo-gradient" x1="44" y1="46" x2="156" y2="154" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#c7d2fe" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" rx="48" fill="#111111" />
            <rect x="0.5" y="0.5" width="199" height="199" rx="47.5" stroke="#262626" strokeWidth="1" />
            <rect x="72" y="46" width="12" height="108" rx="6" fill="url(#logo-gradient)" />
            <rect x="116" y="46" width="12" height="108" rx="6" fill="url(#logo-gradient)" />
            <rect x="44" y="79" width="112" height="12" rx="6" fill="url(#logo-gradient)" />
            <rect x="44" y="109" width="112" height="12" rx="6" fill="url(#logo-gradient)" />
          </svg>
          <h1
            className="text-[17px] tracking-tight"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: 'var(--text-primary)',
            }}
          >
            Scripto<em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>rium</em>
          </h1>
        </div>

        {/* ── Mode toggle — absolute center (desktop only) ── */}
        <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center">
          <div
            className="flex items-center rounded-full p-0.5"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={mode === 'preview' ? onToggle : undefined}
              title="Editor  Ctrl+P"
              aria-label={mode === 'preview' ? 'Show Editor' : 'Editor'}
              className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all duration-200"
              style={mode === 'editor' ? activeToggleStyle : { color: 'var(--text-muted)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editor
            </button>
            <button
              onClick={mode === 'editor' ? onToggle : undefined}
              title="Preview  Ctrl+P"
              aria-label={mode === 'editor' ? 'Show Preview' : 'Preview'}
              className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all duration-200"
              style={mode === 'preview' ? activeToggleStyle : { color: 'var(--text-muted)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>
          </div>
        </div>

        {/* ── Right: tools + auth ─────────────────────────── */}
        <div className="flex-1 flex items-center justify-end gap-1.5 shrink-0">

          {/* Presence */}
          {slug && presenceCount > 1 && <PresenceIndicator count={presenceCount} />}

          {/* Save / status — desktop only; mobile handled by BottomActionBar */}
          {isLoading ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs px-2" style={{ color: 'var(--accent)' }}>
              <Spinner />
              Loading…
            </span>
          ) : slug ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs px-2" style={{ color: 'var(--text-muted)' }}>
              {isSaving && <Spinner />}
              {isSaving ? 'Saving…' : 'Saved'}
            </span>
          ) : (
            <button
              onClick={onSave}
              disabled={markdownText.length === 0 || isSaving}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                color: 'var(--accent)',
                borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
              }}
            >
              {isSaving ? <Spinner /> : 'Save'}
            </button>
          )}

          {/* ── Desktop tool groups ───────────────────────── */}
          <div className="hidden sm:flex items-center gap-1.5">

            {/* Keyboard feature pills — command palette + shortcut help */}
            {(onOpenCommandPalette || onOpenShortcutHelp) && (
              <div className="flex items-center gap-1">
                {onOpenCommandPalette && (
                  <button
                    onClick={onOpenCommandPalette}
                    title="Command palette"
                    aria-label="Command palette"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <span>Commands</span>
                    <kbd
                      className="font-mono text-[10px] px-1 rounded"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}
                    >
                      ⌘K
                    </kbd>
                  </button>
                )}

                {onOpenShortcutHelp && (
                  <button
                    onClick={onOpenShortcutHelp}
                    title="Keyboard shortcuts"
                    aria-label="Keyboard shortcuts"
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    }}
                  >
                    ?
                  </button>
                )}
              </div>
            )}

            {/* Sharing group */}
            <ToolGroup>
              {/* Sidebar */}
              <button
                onClick={onToggleSidebar}
                title={user
                  ? (sidebarOpen ? 'Hide collections' : 'Show collections')
                  : (sidebarOpen ? 'Hide recent docs' : 'Show recent docs')}
                aria-label={user
                  ? (sidebarOpen ? 'Hide collections' : 'Show collections')
                  : (sidebarOpen ? 'Hide recent docs' : 'Show recent docs')}
                className={`${TOOL_BTN} ${sidebarOpen ? '!text-[var(--accent)]' : ''}`}
              >
                {user ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </button>

              {/* Copy link */}
              <button
                onClick={onCopyLink}
                title="Copy link  Ctrl+Shift+C"
                aria-label="Copy link"
                disabled={slug === null}
                className={`${TOOL_BTN} ${TOOL_BTN_DISABLED}`}
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </button>

              {/* Copy markdown */}
              <button
                onClick={onCopyMarkdown}
                title="Copy markdown"
                aria-label="Copy markdown"
                disabled={markdownText.length === 0}
                className={`${TOOL_BTN} ${TOOL_BTN_DISABLED}`}
              >
                {copiedMarkdown ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>

              {/* QR code */}
              <button
                onClick={onShowQr}
                title="Show QR code"
                aria-label="Show QR code"
                disabled={slug === null}
                className={`${TOOL_BTN} ${TOOL_BTN_DISABLED}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
                  <line x1="14" y1="14" x2="14.01" y2="14" strokeWidth="2.5" /><line x1="17" y1="14" x2="17.01" y2="14" strokeWidth="2.5" /><line x1="20" y1="14" x2="20.01" y2="14" strokeWidth="2.5" />
                  <line x1="14" y1="17" x2="14.01" y2="17" strokeWidth="2.5" /><line x1="17" y1="17" x2="20" y2="17" /><line x1="20" y1="17" x2="20.01" y2="17" strokeWidth="2.5" />
                  <line x1="14" y1="20" x2="14.01" y2="20" strokeWidth="2.5" /><line x1="17" y1="20" x2="17.01" y2="20" strokeWidth="2.5" /><line x1="20" y1="20" x2="20.01" y2="20" strokeWidth="2.5" />
                </svg>
              </button>
            </ToolGroup>

            {/* File ops group */}
            <ToolGroup>
              {/* Import PDF */}
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Import PDF"
                title="Import PDF"
                disabled={isPdfImporting}
                className={`${TOOL_BTN} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isPdfImporting ? <Spinner /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /><polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                  </svg>
                )}
              </button>

              {/* Export as dropdown */}
              <div ref={exportRef} className="relative">
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  title="Export as…"
                  aria-label="Export as…"
                  disabled={markdownText.length === 0}
                  className={`${TOOL_BTN} ${TOOL_BTN_DISABLED} ${exportOpen ? '!text-[var(--accent)]' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>

                {exportOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-44 rounded-xl p-1.5 shadow-xl z-50 animate-fade-in"
                    style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
                  >
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Export as</p>
                    <MenuItem onClick={() => { setExportOpen(false); onExportPdf(); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                      </svg>
                      PDF
                    </MenuItem>
                    <MenuItem onClick={() => { setExportOpen(false); onDownloadMarkdown(); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                        <polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                      </svg>
                      Markdown
                    </MenuItem>
                  </div>
                )}
              </div>

              {/* New doc */}
              <button
                onClick={onNewDoc}
                title="New doc  Ctrl+Shift+N"
                aria-label="New doc"
                disabled={slug === null && markdownText.length === 0}
                className={`${TOOL_BTN} ${TOOL_BTN_DISABLED}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </ToolGroup>
          </div>

          {/* ── Mobile overflow menu ──────────────────────── */}
          <div ref={moreRef} className="relative sm:hidden">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More actions"
              className={`${TOOL_BTN} ${moreOpen ? '!text-[var(--accent)] !bg-[var(--bg-secondary)]' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>

            {moreOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl p-1.5 shadow-xl z-50 animate-fade-in"
                style={{
                  backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
                  border: '1px solid var(--border)',
                }}
              >
                <MenuItem onClick={() => handleMenuAction(onCopyMarkdown)} disabled={markdownText.length === 0}>
                  {copiedMarkdown ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  {copiedMarkdown ? 'Copied!' : 'Copy markdown'}
                </MenuItem>

                <MenuItem onClick={() => handleMenuAction(onShowQr)} disabled={slug === null}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
                  </svg>
                  QR code
                </MenuItem>

                <div className="my-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />

                <MenuItem onClick={() => { handleMenuAction(() => {}); fileInputRef.current?.click(); }} disabled={isPdfImporting}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /><polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                  </svg>
                  {isPdfImporting ? 'Importing…' : 'Import PDF'}
                </MenuItem>

                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Export as</p>

                <MenuItem onClick={() => handleMenuAction(onExportPdf)} disabled={markdownText.length === 0}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                  </svg>
                  PDF
                </MenuItem>

                <MenuItem onClick={() => handleMenuAction(onDownloadMarkdown)} disabled={markdownText.length === 0}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                    <polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                  </svg>
                  Markdown
                </MenuItem>
              </div>
            )}
          </div>

          {/* ── Auth ─────────────────────────────────────── */}
          {!isAuthLoading && (
            <>
              <div className="w-px h-4 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
              {user ? (
                <UserMenu user={user} onSignOut={onSignOut} />
              ) : (
                <button
                  onClick={onSignInClick}
                  aria-label="Sign in"
                  className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-150"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  Sign in
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Gradient accent rule */}
      <div
        aria-hidden="true"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, var(--border) 0%, color-mix(in srgb, var(--accent) 60%, var(--border)) 50%, var(--border) 100%)',
          opacity: 0.7,
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </div>
  );
}
