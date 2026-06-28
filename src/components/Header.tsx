import { useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import PresenceIndicator from './PresenceIndicator';
import UserMenu from './UserMenu';
import EditAccessToggle from './EditAccessToggle';
import { useClickOutside } from '../hooks/useClickOutside';

export interface DocumentState {
  slug: string | null;
  markdownText: string;
  presenceCount: number;
}

export interface UiState {
  mode: 'editor' | 'preview' | 'beautify';
  isSaving: boolean;
  isLoading: boolean;
  copied: boolean;
  copiedMarkdown: boolean;
  sidebarOpen: boolean;
  isPdfImporting: boolean;
}

export interface ShareState {
  editAccess: boolean;
  isOwner: boolean;
  editAccessPending: boolean;
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
  onOpenMdFile: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutHelp?: () => void;
  onToggleEditAccess: (value: boolean) => void;
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
  share: ShareState;
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

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const TOOL_BTN =
  'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ' +
  'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]';

const DROPDOWN_PANEL = 'absolute right-0 top-full mt-2 w-52 rounded-xl p-1.5 shadow-xl z-50 animate-fade-in';

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
      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function LabeledBtn({
  onClick,
  disabled = false,
  active = false,
  icon,
  trailing,
  children,
  title,
  'data-onboarding': dataOnboarding,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  'data-onboarding'?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-onboarding={dataOnboarding}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap hover:bg-[var(--bg-secondary)] disabled:hover:bg-transparent ${active ? 'text-[var(--accent)] hover:text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
    >
      {icon}
      {children}
      {trailing}
    </button>
  );
}

const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

type OpenMenu = 'more' | 'share' | 'file' | null;

export default function Header({
  document: { slug, markdownText, presenceCount },
  ui: { mode, isSaving, isLoading, copied, copiedMarkdown, sidebarOpen, isPdfImporting },
  share: { editAccess, isOwner, editAccessPending },
  actions: { onToggle, onSave, onNewDoc, onExportPdf, onDownloadMarkdown, onCopyLink, onCopyMarkdown, onToggleSidebar, onShowQr, onImportPdf, onOpenMdFile, onOpenCommandPalette, onOpenShortcutHelp, onToggleEditAccess },
  auth: { user, isAuthLoading },
  authActions: { onSignInClick, onSignOut },
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  useClickOutside(moreRef, openMenu === 'more', () => setOpenMenu(null));
  useClickOutside(shareRef, openMenu === 'share', () => setOpenMenu(null));
  useClickOutside(fileRef, openMenu === 'file', () => setOpenMenu(null));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImportPdf(file);
    e.target.value = '';
  }

  function handleMenuAction(fn: () => void) {
    setOpenMenu(null);
    fn();
  }

  function toggleShare() {
    setOpenMenu(v => v === 'share' ? null : 'share');
  }

  function toggleFile() {
    setOpenMenu(v => v === 'file' ? null : 'file');
  }

  const activeToggleStyle = {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <header className="relative surface-glass grid items-center h-14 px-4 sm:px-5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

        {/* ── Brand ──────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
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
            style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)' }}
          >
            Open<em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>mark</em>
          </h1>
        </div>

        {/* ── Mode toggle — center-anchored (desktop only) ── */}
        <div
          className="hidden sm:flex items-center rounded-lg p-0.5"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={mode === 'preview' ? onToggle : undefined}
            title="Editor  Ctrl+P"
            aria-label={mode === 'preview' ? 'Show Editor' : 'Editor'}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
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
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
            style={mode === 'preview' ? activeToggleStyle : { color: 'var(--text-muted)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
        </div>

        {/* ── Right: tools + auth ─────────────────────────── */}
        <div className="flex items-center justify-end gap-1">

          {/* Presence */}
          {slug && presenceCount > 1 && <PresenceIndicator count={presenceCount} />}

          {/* Save / status — desktop only */}
          {isLoading ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs px-2" style={{ color: 'var(--accent)' }}>
              <Spinner />Loading…
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
              style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)' }}
            >
              {isSaving ? <Spinner /> : 'Save'}
            </button>
          )}

          {/* ── Desktop tools ──────────────────────────────── */}
          <div className="hidden sm:flex items-center gap-1">

            {/* Command palette */}
            {onOpenCommandPalette && (
              <LabeledBtn
                onClick={onOpenCommandPalette}
                title="Command palette"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                }
                trailing={
                  <kbd className="font-mono text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>⌘K</kbd>
                }
              >
                Commands
              </LabeledBtn>
            )}

            {/* Shortcut help */}
            {onOpenShortcutHelp && (
              <button
                onClick={onOpenShortcutHelp}
                title="Keyboard shortcuts"
                aria-label="Keyboard shortcuts"
                className="flex items-center justify-center w-7 h-7 rounded-lg text-sm font-medium transition-all duration-150 text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                ?
              </button>
            )}

            {(onOpenCommandPalette || onOpenShortcutHelp) && (
              <div className="w-px h-4 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
            )}

            {/* Docs (sidebar) */}
            <LabeledBtn
              onClick={onToggleSidebar}
              active={sidebarOpen}
              data-onboarding="sidebar"
              title={user
                ? (sidebarOpen ? 'Hide collections' : 'Show collections')
                : (sidebarOpen ? 'Hide recent docs' : 'Show recent docs')}
              icon={user ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              )}
            >
              {user ? 'Docs' : 'Recent'}
            </LabeledBtn>

            {/* Share ▾ dropdown */}
            <div ref={shareRef} className="relative">
              <LabeledBtn
                onClick={toggleShare}
                active={openMenu === 'share'}
                data-onboarding="copy-link"
                title="Share options"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                }
                trailing={<ChevronDown />}
              >
                Share
              </LabeledBtn>

              {openMenu === 'share' && (
                <div
                  className={DROPDOWN_PANEL}
                  style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
                >
                  {slug !== null && (
                    <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                      <EditAccessToggle
                        isOwner={isOwner}
                        editAccess={editAccess}
                        onToggle={onToggleEditAccess}
                        pending={editAccessPending}
                      />
                    </div>
                  )}
                  <MenuItem onClick={() => { setOpenMenu(null); onCopyLink(); }} disabled={slug === null}>
                    {copied ? <CheckIcon /> : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    )}
                    {copied ? 'Copied!' : 'Copy link'}
                    {slug === null && (
                      <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>Save first</span>
                    )}
                  </MenuItem>
                  <MenuItem onClick={() => { setOpenMenu(null); onCopyMarkdown(); }} disabled={markdownText.length === 0}>
                    {copiedMarkdown ? <CheckIcon /> : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    {copiedMarkdown ? 'Copied!' : 'Copy markdown'}
                  </MenuItem>
                  <MenuItem onClick={() => { setOpenMenu(null); onShowQr(); }} disabled={slug === null}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
                    </svg>
                    Show QR code
                    {slug === null && (
                      <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>Save first</span>
                    )}
                  </MenuItem>
                </div>
              )}
            </div>

            {/* File ▾ dropdown */}
            <div ref={fileRef} className="relative">
              <LabeledBtn
                onClick={toggleFile}
                active={openMenu === 'file'}
                title="File operations"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                }
                trailing={<ChevronDown />}
              >
                File
              </LabeledBtn>

              {openMenu === 'file' && (
                <div
                  className={DROPDOWN_PANEL}
                  style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
                >
                  <MenuItem onClick={() => { setOpenMenu(null); onOpenMdFile(); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    Open markdown file
                    <kbd className="ml-auto font-mono text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>⌃O</kbd>
                  </MenuItem>
                  <MenuItem
                    onClick={() => { setOpenMenu(null); fileInputRef.current?.click(); }}
                    disabled={isPdfImporting}
                  >
                    {isPdfImporting ? (
                      <Spinner />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                        <polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                      </svg>
                    )}
                    {isPdfImporting ? 'Importing…' : 'Import PDF'}
                  </MenuItem>

                  <div className="my-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Export as</p>

                  <MenuItem onClick={() => { setOpenMenu(null); onExportPdf(); }} disabled={markdownText.length === 0}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                    </svg>
                    PDF
                  </MenuItem>
                  <MenuItem onClick={() => { setOpenMenu(null); onDownloadMarkdown(); }} disabled={markdownText.length === 0}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                      <polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                    </svg>
                    Markdown
                  </MenuItem>
                </div>
              )}
            </div>

            {/* New doc — accent CTA */}
            <button
              onClick={onNewDoc}
              disabled={slug === null && markdownText.length === 0}
              title="New doc  Ctrl+Shift+N"
              aria-label="New doc"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ml-1 text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:hover:bg-[var(--accent)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          </div>

          {/* ── Mobile overflow menu ──────────────────────── */}
          <div ref={moreRef} className="relative sm:hidden">
            <button
              onClick={() => setOpenMenu(v => v === 'more' ? null : 'more')}
              aria-label="More actions"
              className={`${TOOL_BTN} ${openMenu === 'more' ? '!text-[var(--accent)] !bg-[var(--bg-secondary)]' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>

            {openMenu === 'more' && (
              <div
                className={DROPDOWN_PANEL}
                style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
              >
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Share</p>
                <MenuItem onClick={() => handleMenuAction(onCopyLink)} disabled={slug === null}>
                  {copied ? <CheckIcon /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                  {copied ? 'Copied!' : 'Copy link'}
                </MenuItem>
                <MenuItem onClick={() => handleMenuAction(onCopyMarkdown)} disabled={markdownText.length === 0}>
                  {copiedMarkdown ? <CheckIcon /> : (
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
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>File</p>

                <MenuItem onClick={() => handleMenuAction(onOpenMdFile)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Open markdown file
                </MenuItem>
                <MenuItem onClick={() => { setOpenMenu(null); fileInputRef.current?.click(); }} disabled={isPdfImporting}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /><polyline points="8 15 12 19 16 15" /><line x1="12" y1="12" x2="12" y2="19" />
                  </svg>
                  {isPdfImporting ? 'Importing…' : 'Import PDF'}
                </MenuItem>

                <div className="my-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
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
                  className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
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
