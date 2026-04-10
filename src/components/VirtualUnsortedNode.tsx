import { useState } from 'react';
import type { DocSummary } from '../api/docsApi';
import type { CollectionTree } from '../types/collections';
import DocRow from './DocRow';
import MoveDocPopover from './MoveDocPopover';
import { ChevronIcon, InboxIcon } from './SidebarIcons';
import { INDENT_BASE, INDENT_STEP } from './sidebar.constants';

interface VirtualUnsortedNodeProps {
  docs: DocSummary[];
  isExpanded: boolean;
  currentSlug: string | null;
  tree: CollectionTree;
  onToggle: () => void;
  onNavigateToDoc: (slug: string) => void;
  onMoveDoc: (slug: string, collectionId: string | null) => void;
}

export default function VirtualUnsortedNode({
  docs,
  isExpanded,
  currentSlug,
  tree,
  onToggle,
  onNavigateToDoc,
  onMoveDoc,
}: VirtualUnsortedNodeProps) {
  const [movingDocSlug, setMovingDocSlug] = useState<string | null>(null);

  function handleMoveDoc(slug: string, collectionId: string | null) {
    onMoveDoc(slug, collectionId);
    setMovingDocSlug(null);
  }

  return (
    <div>
      {/* Row — no kebab menu since this node is non-deletable */}
      <div
        className="flex items-center gap-1 py-1.5 pr-2"
        style={{ paddingLeft: INDENT_BASE }}
      >
        <button
          onClick={onToggle}
          className="shrink-0 flex items-center justify-center w-4 h-4"
          style={{ color: 'var(--text-muted)' }}
          aria-label={isExpanded ? 'Collapse unsorted' : 'Expand unsorted'}
        >
          <ChevronIcon isExpanded={isExpanded} />
        </button>

        <InboxIcon />

        <button
          onClick={onToggle}
          className="flex-1 min-w-0 text-xs font-medium text-left truncate"
          style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
        >
          Unsorted
        </button>

        <span
          className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full tabular-nums"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'var(--border-light)',
            border: '1px solid var(--border)',
          }}
        >
          {docs.length}
        </span>
      </div>

      {/* Docs — animated expand/collapse via CSS grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {docs.map((doc) => (
            <div key={doc.slug} className="relative">
              <DocRow
                doc={doc}
                isActive={doc.slug === currentSlug}
                depth={1}
                onNavigateToDoc={onNavigateToDoc}
                onMoveDoc={(slug) => setMovingDocSlug(slug)}
              />
              {movingDocSlug === doc.slug && (
                <MoveDocPopover
                  tree={tree}
                  currentCollectionId={doc.collectionId}
                  onMove={(collectionId) => handleMoveDoc(doc.slug, collectionId)}
                  onClose={() => setMovingDocSlug(null)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Exported for testing
export { INDENT_BASE, INDENT_STEP };
