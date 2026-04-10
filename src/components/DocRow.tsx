import { useState } from 'react';
import type { DocSummary } from '../api/docsApi';
import { DocIcon, KebabIcon, MoveIcon } from './SidebarIcons';
import { INDENT_BASE, INDENT_STEP } from './sidebar.constants';

interface DocRowProps {
  doc: DocSummary;
  isActive: boolean;
  depth: number;
  onNavigateToDoc: (slug: string) => void;
  onMoveDoc: (slug: string, collectionId: string | null) => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function DocRow({ doc, isActive, depth, onNavigateToDoc, onMoveDoc }: DocRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const paddingLeft = INDENT_BASE + depth * INDENT_STEP;

  return (
    <div className="relative group">
      <button
        onClick={() => onNavigateToDoc(doc.slug)}
        className="w-full flex items-start gap-2 py-1.5 pr-8 text-left"
        style={{
          paddingLeft,
          backgroundColor: isActive ? 'var(--border-light)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          transition: 'background-color 0.1s, border-color 0.1s',
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        <DocIcon isActive={isActive} />
        <div className="flex-1 min-w-0">
          {doc.title ? (
            <>
              <p
                className="text-xs font-medium truncate leading-snug"
                style={{ color: 'var(--text-primary)' }}
              >
                {doc.title}
              </p>
              <p
                className="text-[10px] truncate mt-0.5"
                style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}
              >
                {doc.slug}
              </p>
            </>
          ) : (
            <p
              className="text-xs truncate leading-snug"
              style={{ color: 'var(--text-primary)', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              {doc.slug}
            </p>
          )}
          <time
            dateTime={doc.updatedAt}
            className="text-[10px] block mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {formatDate(doc.updatedAt)}
          </time>
        </div>
      </button>

      {/* Kebab — absolutely positioned to overlay the row without disrupting flex layout */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        aria-label="Doc options"
      >
        <KebabIcon />
      </button>

      {menuOpen && (
        <MoveMenu
          onMove={(collectionId) => { onMoveDoc(doc.slug, collectionId); setMenuOpen(false); }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

interface MoveMenuProps {
  onMove: (collectionId: string | null) => void;
  onClose: () => void;
}

function MoveMenu({ onMove, onClose }: MoveMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute right-0 top-8 z-50 w-40 rounded-lg overflow-hidden py-1"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={() => onMove(null)}
          className="w-full px-3 py-1.5 text-xs text-left transition-colors flex items-center gap-2.5"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          <span style={{ opacity: 0.65 }}><MoveIcon /></span>
          Move to…
        </button>
      </div>
    </>
  );
}
