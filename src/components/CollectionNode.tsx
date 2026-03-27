import { useState, useRef, useEffect } from 'react';
import type { CollectionNode as CollectionNodeType, CollectionTree, CreateCollectionInput } from '../types/collections';
import DocRow from './DocRow';
import CollectionContextMenu from './CollectionContextMenu';
import MoveDocPopover from './MoveDocPopover';

interface CollectionNodeProps {
  node: CollectionNodeType;
  depth: number;
  isExpanded: boolean;
  currentSlug: string | null;
  tree: CollectionTree;
  onToggle: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
  onNewDoc: (collectionId: string) => void;
  onNewSubCollection: (input: CreateCollectionInput) => void;
  onNavigateToDoc: (slug: string) => void;
  onMoveDoc: (slug: string, collectionId: string | null) => void;
  children?: React.ReactNode;
}

export default function CollectionNode({
  node,
  depth,
  isExpanded,
  currentSlug,
  tree,
  onToggle,
  onRename,
  onDelete,
  onNewDoc,
  onNewSubCollection,
  onNavigateToDoc,
  onMoveDoc,
  children,
}: CollectionNodeProps) {
  const { collection } = node;
  const paddingLeft = 8 + depth * 16;

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
      void onRename(collection.id, trimmed);
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
    onMoveDoc(slug, collectionId);
    setMovingDocSlug(null);
  }

  return (
    <div>
      {/* Collection row */}
      <div
        className="relative group flex items-center gap-1 py-1.5 pr-2"
        style={{ paddingLeft }}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={onToggle}
          className="shrink-0 flex items-center justify-center w-4 h-4 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 transition-transform"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Name or rename input */}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 min-w-0 text-xs px-1 rounded outline-none"
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
            onClick={onToggle}
          >
            {collection.name}
          </button>
        )}

        {/* Kebab menu */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          aria-label="Collection options"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {menuOpen && !confirmDelete && (
          <CollectionContextMenu
            collectionName={collection.name}
            onNewDoc={() => { setMenuOpen(false); onNewDoc(collection.id); }}
            onNewSubCollection={() => { setMenuOpen(false); onNewSubCollection({ name: '', parentId: collection.id }); }}
            onRename={() => { setMenuOpen(false); setIsRenaming(true); setDraftName(collection.name); }}
            onDelete={() => { setMenuOpen(false); setConfirmDelete(true); }}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div
          className="mx-2 mb-1 p-2 rounded text-xs"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <p className="mb-1.5" style={{ color: '#991b1b' }}>
            Delete &quot;{collection.name}&quot;? Its docs will move to root.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 rounded text-xs transition-colors"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--border-light)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(collection.id); }}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: '#dc2626', color: '#fff' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div>
          {node.docs.map((doc) => (
            <div key={doc.slug} className="relative">
              <DocRow
                doc={doc}
                isActive={doc.slug === currentSlug}
                depth={depth + 1}
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
          {children}
        </div>
      )}
    </div>
  );
}
