import { useState, useRef, useEffect } from 'react';
import type { CollectionNode as CollectionNodeType, CollectionTree, CreateCollectionInput } from '../types/collections';
import DocRow from './DocRow';
import CollectionContextMenu from './CollectionContextMenu';
import MoveDocPopover from './MoveDocPopover';
import { ChevronIcon, FolderIcon, KebabIcon } from './SidebarIcons';
import { SidebarActionButton } from './SidebarIconButton';
import { INDENT_BASE, INDENT_STEP } from './sidebar.constants';

// All callbacks the parent must supply. Grouped to keep CollectionNodeProps
// under the 3-parameter smell threshold (replaces 7 individual callback props).
export interface CollectionNodeActions {
  onToggle: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNewDoc: (collectionId: string) => void;
  onNewSubCollection: (input: CreateCollectionInput) => void;
  onNavigateToDoc: (slug: string) => void;
  onMoveDoc: (slug: string, collectionId: string | null) => void;
}

interface CollectionNodeProps {
  node: CollectionNodeType;
  depth: number;
  isExpanded: boolean;
  currentSlug: string | null;
  tree: CollectionTree;
  actions: CollectionNodeActions;
  children?: React.ReactNode;
}

function totalDocs(node: CollectionNodeType): number {
  return node.docs.length + node.children.reduce((acc, child) => acc + totalDocs(child), 0);
}

function DeleteConfirmation({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="mx-2 mb-1.5 p-2.5 rounded-md text-xs"
      style={{
        backgroundColor: 'rgba(220, 38, 38, 0.06)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
      }}
    >
      <p className="mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
        Delete <span style={{ fontWeight: 600 }}>&quot;{name}&quot;</span>?
        Its docs will move to root.
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={onCancel}
          className="px-2.5 py-1 rounded-md text-xs transition-colors"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--border-light)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)'; }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: '#dc2626', color: '#fff' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function CollectionNode({
  node,
  depth,
  isExpanded,
  currentSlug,
  tree,
  actions,
  children,
}: CollectionNodeProps) {
  const { collection } = node;
  const paddingLeft = INDENT_BASE + depth * INDENT_STEP;
  const docCount = totalDocs(node);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(collection.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [movingDocSlug, setMovingDocSlug] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.select();
  }, [isRenaming]);

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== collection.name) {
      void actions.onRename(collection.id, trimmed);
    } else {
      setDraftName(collection.name);
    }
    setIsRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setDraftName(collection.name); setIsRenaming(false); }
  }

  function handleMoveDoc(slug: string, collectionId: string | null) {
    actions.onMoveDoc(slug, collectionId);
    setMovingDocSlug(null);
  }

  function handleDeleteConfirmed() {
    setConfirmDelete(false);
    void actions.onDelete(collection.id);
  }

  return (
    <div>
      {/* Collection row */}
      <div className="relative group flex items-center gap-1 py-1.5 pr-2" style={{ paddingLeft }}>
        <button
          onClick={actions.onToggle}
          className="shrink-0 flex items-center justify-center w-4 h-4"
          style={{ color: 'var(--text-muted)' }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronIcon isExpanded={isExpanded} />
        </button>

        <FolderIcon isOpen={isExpanded} />

        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 min-w-0 text-xs px-1.5 py-0.5 rounded-md outline-none"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--accent)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
            maxLength={200}
          />
        ) : (
          <button
            className="flex-1 min-w-0 text-xs font-medium text-left truncate"
            style={{ color: 'var(--text-primary)' }}
            onDoubleClick={() => { setIsRenaming(true); setDraftName(collection.name); }}
            onClick={actions.onToggle}
          >
            {collection.name}
          </button>
        )}

        {!isRenaming && docCount > 0 && (
          <span
            className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full tabular-nums"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--border-light)',
              border: '1px solid var(--border)',
            }}
          >
            {docCount}
          </span>
        )}

        <SidebarActionButton
          onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
          label="Collection options"
        >
          <KebabIcon />
        </SidebarActionButton>

        {menuOpen && !confirmDelete && (
          <CollectionContextMenu
            collectionName={collection.name}
            onNewDoc={() => { setMenuOpen(false); actions.onNewDoc(collection.id); }}
            onNewSubCollection={() => {
              setMenuOpen(false);
              actions.onNewSubCollection({ name: '', parentId: collection.id });
            }}
            onRename={() => { setMenuOpen(false); setIsRenaming(true); setDraftName(collection.name); }}
            onDelete={() => { setMenuOpen(false); setConfirmDelete(true); }}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>

      {confirmDelete && (
        <DeleteConfirmation
          name={collection.name}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteConfirmed}
        />
      )}

      {/* Animated expand/collapse via CSS grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {node.docs.map((doc) => (
            <div key={doc.slug} className="relative">
              <DocRow
                doc={doc}
                isActive={doc.slug === currentSlug}
                depth={depth + 1}
                onNavigateToDoc={actions.onNavigateToDoc}
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
          {children}
        </div>
      </div>
    </div>
  );
}
