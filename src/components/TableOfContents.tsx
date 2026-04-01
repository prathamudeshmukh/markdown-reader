import { useRef, useEffect } from 'react';
import { type Heading } from '../utils/headings';

interface TableOfContentsProps {
  headings: Heading[];
  activeId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// H1 headings are typically doc titles — filtered out so nav starts at H2
const LEVEL_STYLE: Record<1 | 2 | 3 | 4, { indent: string; fontSize: string; opacity: string }> = {
  1: { indent: '',      fontSize: 'text-sm',     opacity: '1'    }, // filtered; included for type completeness
  2: { indent: '',      fontSize: 'text-sm',     opacity: '1'    },
  3: { indent: 'pl-3',  fontSize: 'text-xs',     opacity: '0.75' },
  4: { indent: 'pl-8',  fontSize: 'text-xs',     opacity: '0.55' },
};

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center w-6 h-6 rounded transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export default function TableOfContents({ headings, activeId, isOpen, onToggle }: TableOfContentsProps) {
  const visibleHeadings = headings.filter((h) => h.level !== 1);
  const navRef = useRef<HTMLElement>(null);

  // Keep the active heading visible within the TOC's own scroll container
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>(`[data-heading-id="${CSS.escape(activeId)}"]`);
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeId]);

  if (visibleHeadings.length < 2) return null;

  const activeIndex = visibleHeadings.findIndex((h) => h.id === activeId);
  const progress = activeIndex >= 0 ? ((activeIndex + 1) / visibleHeadings.length) * 100 : 0;

  return (
    <aside
      className="hidden sm:flex flex-col shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out self-stretch"
      style={{
        width: isOpen ? '17rem' : '2.5rem',
        borderLeft: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
      }}
      aria-label="Table of contents"
    >
      {isOpen ? (
        <>
          {/* Reading progress bar */}
          <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: 'var(--border-light)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>

          {/* Header — matches CollectionsSidebar header */}
          <div
            className="px-4 py-4 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-widest font-display"
              style={{ color: 'var(--text-muted)' }}
            >
              On this page
            </p>
            <IconButton onClick={onToggle} label="Collapse table of contents">
              <CloseIcon className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {/* Heading list */}
          <nav ref={navRef} className="flex-1 overflow-y-auto py-3" aria-label="Table of contents">
            <ul className="space-y-0.5">
              {visibleHeadings.map((heading) => {
                const isActive = heading.id === activeId;
                const levelStyle = LEVEL_STYLE[heading.level];
                return (
                  <li key={heading.id} className={levelStyle.indent}>
                    <button
                      data-heading-id={heading.id}
                      onClick={() => scrollToHeading(heading.id)}
                      className={`w-full text-left ${levelStyle.fontSize} leading-relaxed py-1.5 px-4 transition-colors truncate`}
                      style={{
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        opacity: isActive ? 1 : parseFloat(levelStyle.opacity),
                        fontWeight: isActive ? 500 : undefined,
                        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        backgroundColor: isActive
                          ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                          : undefined,
                      }}
                      title={heading.text}
                      onMouseEnter={(e) => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {heading.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      ) : (
        /* Collapsed — chevron icon with tooltip as expand affordance */
        <button
          onClick={onToggle}
          aria-label="Expand table of contents"
          title="Show contents"
          className="flex-1 flex items-center justify-center w-full"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      )}
    </aside>
  );
}

interface MobileTocProps {
  headings: Heading[];
  activeId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

// MobileToc renders only the slide-up drawer. The trigger button lives in BottomActionBar.
export function MobileToc({ headings, activeId, isOpen, onToggle }: MobileTocProps) {
  const visibleHeadings = headings.filter((h) => h.level !== 1);
  if (visibleHeadings.length < 2) return null;
  if (!isOpen) return null;

  return (
    <>
      <div
        className="sm:hidden fixed inset-0 z-20"
        onClick={onToggle}
        aria-hidden="true"
      />
      <div
        className="sm:hidden fixed inset-x-0 z-30 rounded-t-xl overflow-hidden animate-slide-up"
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          maxHeight: '50vh',
          backgroundColor: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          className="px-4 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest font-display"
            style={{ color: 'var(--text-muted)' }}
          >
            On this page
          </p>
          <IconButton onClick={onToggle} label="Close table of contents">
            <CloseIcon className="h-3.5 w-3.5" />
          </IconButton>
        </div>
        <nav className="overflow-y-auto" style={{ maxHeight: 'calc(50vh - 3.25rem)' }} aria-label="Table of contents">
          <ul className="py-3 space-y-0.5">
            {visibleHeadings.map((heading) => {
              const isActive = heading.id === activeId;
              const levelStyle = LEVEL_STYLE[heading.level];
              return (
                <li key={heading.id} className={levelStyle.indent}>
                  <button
                    onClick={() => {
                      scrollToHeading(heading.id);
                      onToggle();
                    }}
                    className={`w-full text-left ${levelStyle.fontSize} leading-relaxed py-2 px-4 transition-colors truncate`}
                    style={{
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      opacity: isActive ? 1 : parseFloat(levelStyle.opacity),
                      fontWeight: isActive ? 500 : undefined,
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                        : undefined,
                    }}
                    title={heading.text}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {heading.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
