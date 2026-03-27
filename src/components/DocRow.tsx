import { useState } from 'react';
import type { DocSummary } from '../api/docsApi';

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
  const paddingLeft = 16 + depth * 16;

  return (
    <div className="relative group">
      <button
        onClick={() => onNavigateToDoc(doc.slug)}
        className="w-full flex flex-col gap-0.5 py-2 pr-8 text-left transition-colors"
        style={{
          paddingLeft,
          backgroundColor: isActive ? 'var(--border-light)' : 'transparent',
          color: 'var(--text-primary)',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        {doc.title ? (
          <>
            <span className="text-xs font-medium truncate w-full pr-2">{doc.title}</span>
            <span
              className="font-mono text-[10px] truncate w-full"
              style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}
            >
              {doc.slug}
            </span>
          </>
        ) : (
          <span
            className="font-mono text-xs truncate w-full"
            style={{ fontFamily: '"IBM Plex Mono", monospace' }}
          >
            {doc.slug}
          </span>
        )}
        <time
          dateTime={doc.updatedAt}
          className="text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {formatDate(doc.updatedAt)}
        </time>
      </button>

      {/* Kebab menu button */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        aria-label="Doc options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {/* Move menu */}
      {menuOpen && (
        <MoveMenu
          slug={doc.slug}
          onMove={(collectionId) => { onMoveDoc(doc.slug, collectionId); setMenuOpen(false); }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

interface MoveMenuProps {
  slug: string;
  onMove: (collectionId: string | null) => void;
  onClose: () => void;
}

function MoveMenu({ onMove, onClose }: MoveMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute right-0 top-8 z-50 w-36 rounded shadow-lg overflow-hidden"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <button
          onClick={() => onMove(null)}
          className="w-full px-3 py-2 text-xs text-left transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          Move to…
        </button>
      </div>
    </>
  );
}
