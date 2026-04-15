import { useState, useEffect, useRef, forwardRef } from 'react';
import type { CollectionTree, CollectionNode as CollectionNodeType, CreateCollectionInput } from '../types/collections';
import { findDocCollectionId, getAncestorIds, flattenTree } from '../utils/collectionTree';
import CollectionNodeComponent, { type CollectionNodeActions } from './CollectionNode';
import VirtualUnsortedNode from './VirtualUnsortedNode';
import { ListIcon, PlusIcon, CloseIcon } from './SidebarIcons';
import { SidebarButton } from './SidebarIconButton';
import { INDENT_BASE, INDENT_STEP, INLINE_CREATE_OFFSET, SIDEBAR_BACKDROP_COLOR } from './sidebar.constants';
import MobileSheetChrome from './MobileSheetChrome';

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
    const paddingLeft = INDENT_BASE + depth * INDENT_STEP + INLINE_CREATE_OFFSET;
    return (
      <div className="py-1" style={{ paddingLeft, paddingRight: 8 }}>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder="Collection name…"
          className="w-full text-xs px-2 py-1 rounded-md outline-none"
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
  const [unsortedExpanded, setUnsortedExpanded] = useState(true);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [createDraft, setCreateDraft] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEnableTransition(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Auto-expand the collection containing the current doc
  useEffect(() => {
    if (!currentSlug) return;

    const isRootDoc = tree.rootDocs.some((d) => d.slug === currentSlug);
    if (isRootDoc) {
      setUnsortedExpanded(true);
      return;
    }

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

  function buildActions(id: string): CollectionNodeActions {
    return {
      onToggle: () => toggleExpanded(id),
      onRename: onRenameCollection,
      onDelete: onDeleteCollection,
      onNewDoc: onNewDocInCollection,
      onNewSubCollection: ({ parentId: pid }) => {
        setPendingCreate({ parentId: pid ?? null });
        setCreateDraft('');
        if (pid) setExpanded((prev) => new Set([...prev, pid]));
      },
      onNavigateToDoc,
      onMoveDoc: (slug, collectionId) => void onMoveDoc(slug, collectionId),
    };
  }

  function renderCollectionNode(node: CollectionNodeType, depth: number): React.ReactNode {
    const id = node.collection.id;
    return (
      <CollectionNodeComponent
        key={id}
        node={node}
        depth={depth}
        isExpanded={expanded.has(id)}
        currentSlug={currentSlug}
        tree={tree}
        actions={buildActions(id)}
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

  const hasUnsorted = tree.rootDocs.length > 0;
  const isEmpty =
    !hasUnsorted &&
    tree.rootCollections.length === 0 &&
    !pendingCreate;

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 z-30"
          style={{ backgroundColor: SIDEBAR_BACKDROP_COLOR }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel — bottom sheet on mobile, right panel on desktop */}
    <aside
      className={[
        'fixed inset-x-0 z-40',
        'bottom-[calc(56px+env(safe-area-inset-bottom))] max-h-[80vh] rounded-t-2xl',
        'sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:w-64 sm:pt-[57px] sm:max-h-none sm:rounded-none',
        'flex flex-col overflow-hidden',
        enableTransition ? 'transition-transform duration-200 ease-in-out' : '',
        isOpen
          ? 'translate-y-0 sm:translate-x-0 sm:translate-y-0'
          : 'translate-y-full sm:translate-x-full sm:translate-y-0',
      ].join(' ')}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
      }}
      aria-label="My Collections"
    >
        <MobileSheetChrome />

      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-2">
          <ListIcon />
          <p
            className="text-[10px] font-semibold uppercase tracking-widest font-display"
            style={{ color: 'var(--text-muted)' }}
          >
            Collections
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <SidebarButton
            onClick={() => { setPendingCreate({ parentId: null }); setCreateDraft(''); }}
            label="New collection"
          >
            <PlusIcon />
          </SidebarButton>
          <SidebarButton onClick={onClose} label="Close sidebar">
            <CloseIcon />
          </SidebarButton>
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--border-light)', border: '1px solid var(--border)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                No docs or collections
              </p>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Use <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>+</span> above to create your first collection
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Root docs wrapped in the virtual Unsorted node */}
            {hasUnsorted && (
              <VirtualUnsortedNode
                docs={tree.rootDocs}
                isExpanded={unsortedExpanded}
                currentSlug={currentSlug}
                tree={tree}
                onToggle={() => setUnsortedExpanded((prev) => !prev)}
                onNavigateToDoc={onNavigateToDoc}
                onMoveDoc={(slug, collectionId) => void onMoveDoc(slug, collectionId)}
              />
            )}

            {/* Inline input for creating a new root collection */}
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

      {/* Footer — New doc */}
      <div className="shrink-0 px-2 py-2" style={{ borderTop: '1px solid var(--border-light)' }}>
        <button
          onClick={() => onNewDocInCollection(null)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          New doc
        </button>
      </div>
    </aside>
    </>
  );
}
