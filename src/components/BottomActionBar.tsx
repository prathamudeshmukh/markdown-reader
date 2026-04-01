import type { DocumentState, UiState, HeaderActions, AuthState } from './Header';

interface TocTriggerProps {
  isOpen: boolean;
  hasHeadings: boolean;
  onToggle: () => void;
}

interface BottomActionBarProps {
  document: DocumentState;
  ui: UiState;
  actions: Pick<HeaderActions, 'onToggle' | 'onSave' | 'onCopyLink' | 'onNewDoc' | 'onToggleSidebar' | 'onImportPdf' | 'onExportPdf' | 'onDownloadMarkdown' | 'onShowQr' | 'onCopyMarkdown'>;
  auth: Pick<AuthState, 'user'>;
  toc?: TocTriggerProps;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

interface BarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

function BarButton({ onClick, disabled = false, active = false, label, children }: BarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[52px] py-2 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
    >
      {children}
      <span className="text-[10px] font-medium tracking-wide" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {label}
      </span>
    </button>
  );
}

export default function BottomActionBar({
  document: { slug, markdownText },
  ui: { mode, isSaving, isLoading, copied, sidebarOpen },
  actions: { onToggle, onSave, onCopyLink, onNewDoc, onToggleSidebar },
  auth: { user },
  toc,
}: BottomActionBarProps) {
  const isNewDoc = slug === null;
  const isEmpty = markdownText.length === 0;

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 animate-slide-down"
      style={{
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Mobile actions"
    >
      <div
        className="surface-glass flex items-stretch"
        style={{ minHeight: '56px' }}
      >
        {/* Sidebar */}
        <BarButton
          onClick={onToggleSidebar}
          active={sidebarOpen}
          label={user ? 'Docs' : 'Recent'}
        >
          {user ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          )}
        </BarButton>

        {/* Divider */}
        <div className="w-px self-stretch my-3" style={{ backgroundColor: 'var(--border-light)' }} />

        {/* Mode toggle */}
        <BarButton
          onClick={onToggle}
          active={false}
          label={mode === 'editor' ? 'Preview' : 'Edit'}
        >
          {mode === 'editor' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )}
        </BarButton>

        {/* Divider */}
        <div className="w-px self-stretch my-3" style={{ backgroundColor: 'var(--border-light)' }} />

        {/* Contents — visible only in preview mode when document has headings */}
        {mode === 'preview' && toc?.hasHeadings && (
          <>
            <BarButton
              onClick={toc.onToggle}
              active={toc.isOpen}
              label="Contents"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="12" y2="18" />
              </svg>
            </BarButton>
            <div className="w-px self-stretch my-3" style={{ backgroundColor: 'var(--border-light)' }} />
          </>
        )}

        {/* Save — centre, slightly elevated */}
        <div className="flex flex-col items-center justify-center flex-1 py-2">
          {isLoading ? (
            <div className="flex flex-col items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
              <Spinner />
              <span className="text-[10px] font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Loading</span>
            </div>
          ) : slug ? (
            <div
              className="flex flex-col items-center gap-0.5"
              style={{ color: isSaving ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {isSaving ? <Spinner /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className="text-[10px] font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {isSaving ? 'Saving' : 'Saved'}
              </span>
            </div>
          ) : (
            <button
              onClick={onSave}
              disabled={isEmpty || isSaving}
              aria-label="Save document"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              }}
            >
              {isSaving ? <Spinner /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              <span className="text-[10px] font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Save</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px self-stretch my-3" style={{ backgroundColor: 'var(--border-light)' }} />

        {/* Share / copy link */}
        <BarButton
          onClick={onCopyLink}
          disabled={isNewDoc}
          active={copied}
          label={copied ? 'Copied!' : 'Share'}
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
        </BarButton>

        {/* Divider */}
        <div className="w-px self-stretch my-3" style={{ backgroundColor: 'var(--border-light)' }} />

        {/* New doc */}
        <BarButton
          onClick={onNewDoc}
          disabled={isNewDoc && isEmpty}
          label="New"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </BarButton>
      </div>
    </nav>
  );
}
