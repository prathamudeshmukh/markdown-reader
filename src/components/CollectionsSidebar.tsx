import { useState, useEffect, useRef, forwardRef } from 'react';
import type { CollectionTree, CollectionNode as CollectionNodeType, CreateCollectionInput } from '../types/collections';
import { findDocCollectionId, getAncestorIds, flattenTree } from '../utils/collectionTree';
import CollectionNodeComponent from './CollectionNode';
import DocRow from './DocRow';
import MoveDocPopover from './MoveDocPopover';

interface CollectionsSidebarProps {
  tree: CollectionTree;
  isOpen: boolean;
  currentSlug: string | null;
  onClose: () => void;
  onCreateCollection: (input: CreateCollectionInput) => Promise<void>;
  onRenameCollection: (id: string, name: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onMoveDoc: (slug: string, collectionId: string | null) => Promise<void>;
  onNavigateToDoc: (slug: string) => void;
  onNewDocInCollection: (collectionId: string | null) => void;
}

interface PendingCreate {
  parentId: string | null;
}

interface InlineCreateInputProps {
  depth: number;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
}

const InlineCreateInput = forwardRef<HTMLInputElement, InlineCreateInputProps>(
  ({ depth, value, onChange, onKeyDown, onBlur }, ref) => {
    const paddingLeft = 8 + depth * 16 + 20;
    return (
      <div className="py-1" style={{ paddingLeft, paddingRight: 8 }}>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder="Collection name…"
          className="w-full text-xs px-2 py-1 rounded outline-none"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
          maxLength={200}
        />
      </div>
    );
  },
);
InlineCreateInput.displayName = 'InlineCreateInput';

export default function CollectionsSidebar({
  tree,
  isOpen,
  currentSlug,
  onClose,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onMoveDoc,
  onNavigateToDoc,
  onNewDocInCollection,
}: CollectionsSidebarProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [createDraft, setCreateDraft] = useState('');
  const [movingDocSlug, setMovingDocSlug] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEnableTransition(true), 0);
    return () => clearTimeout(id);
  }, []);

  // Auto-expand the collection containing the current doc
  useEffect(() => {
    if (!currentSlug) return;
    const containerId = findDocCollectionId(tree, currentSlug);
    if (!containerId) return;

    const allCollections = flattenTree(tree).map((f) => f.collection);
    const ancestors = getAncestorIds(allCollections, containerId);
    setExpanded((prev) => new Set([...prev, containerId, ...ancestors]));
  }, [currentSlug, tree]);

  useEffect(() => {
    if (pendingCreate !== null) createInputRef.current?.focus();
  }, [pendingCreate]);

  function toggleExpanded(id: string) {
    setExpanded((prev) =>
      prev.has(id)
        ? new Set([...prev].filter((x) => x !== id))
        : new Set([...prev, id]),
    );
  }

  async function commitCreate() {
    const name = createDraft.trim();
    if (name && pendingCreate) {
      await onCreateCollection({ name, parentId: pendingCreate.parentId });
      if (pendingCreate.parentId) {
        setExpanded((prev) => new Set([...prev, pendingCreate.parentId as string]));
      }
    }
    setPendingCreate(null);
    setCreateDraft('');
  }

  function handleCreateKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); void commitCreate(); }
    if (e.key === 'Escape') { setPendingCreate(null); setCreateDraft(''); }
  }

  function handleMoveDoc(slug: string, collectionId: string | null) {
    void onMoveDoc(slug, collectionId);
    setMovingDocSlug(null);
  }

  function renderCollectionNode(node: CollectionNodeType, depth: number): React.ReactNode {
    const id = node.collection.id;
    const isExpand = expanded.has(id);

    return (
      <CollectionNodeComponent
        key={id}
        node={node}
        depth={depth}
        isExpanded={isExpand}
        currentSlug={currentSlug}
        tree={tree}
        onToggle={() => toggleExpanded(id)}
        onRename={onRenameCollection}
        onDelete={(colId) => void onDeleteCollection(colId)}
        onNewDoc={(colId) => onNewDocInCollection(colId)}
        onNewSubCollection={({ parentId }) => {
          setPendingCreate({ parentId: parentId ?? null });
          setCreateDraft('');
          if (parentId) setExpanded((prev) => new Set([...prev, parentId]));
        }}
        onNavigateToDoc={onNavigateToDoc}
        onMoveDoc={handleMoveDoc}
      >
        {pendingCreate?.parentId === id && (
          <InlineCreateInput
            ref={createInputRef}
            depth={depth + 1}
            value={createDraft}
            onChange={setCreateDraft}
            onKeyDown={handleCreateKeyDown}
            onBlur={() => void commitCreate()}
          />
        )}
        {node.children.map((child) => renderCollectionNode(child, depth + 1))}
      </CollectionNodeComponent>
    );
  }

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 w-64 pt-[57px]',
        'flex flex-col overflow-hidden',
        enableTransition ? 'transition-transform duration-200 ease-in-out' : '',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
      aria-label="My Collections"
    >
        {/* Header */}
        <div
          className="px-3 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest font-display"
            style={{ color: 'var(--text-muted)' }}
          >
            My Collections
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPendingCreate({ parentId: null }); setCreateDraft(''); }}
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
              aria-label="New collection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={onClose}
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
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {tree.rootDocs.length === 0 && tree.rootCollections.length === 0 && !pendingCreate ? (
            <p className="px-4 py-5 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              No docs or collections yet
            </p>
          ) : (
            <>
              {tree.rootDocs.map((doc) => (
                <div key={doc.slug} className="relative">
                  <DocRow
                    doc={doc}
                    isActive={doc.slug === currentSlug}
                    depth={0}
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

              {pendingCreate?.parentId === null && (
                <InlineCreateInput
                  ref={createInputRef}
                  depth={0}
                  value={createDraft}
                  onChange={setCreateDraft}
                  onKeyDown={handleCreateKeyDown}
                  onBlur={() => void commitCreate()}
                />
              )}

              {tree.rootCollections.map((node) => renderCollectionNode(node, 0))}
            </>
          )}
        </div>

        {/* New doc button */}
        <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={() => onNewDocInCollection(null)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New doc
          </button>
        </div>
      </aside>
  );
}

