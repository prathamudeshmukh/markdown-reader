import { flattenTree } from '../utils/collectionTree';
import type { CollectionTree } from '../types/collections';

interface MoveDocPopoverProps {
  tree: CollectionTree;
  currentCollectionId: string | null;
  onMove: (collectionId: string | null) => void;
  onClose: () => void;
}

export default function MoveDocPopover({ tree, currentCollectionId, onMove, onClose }: MoveDocPopoverProps) {
  const flat = flattenTree(tree);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute right-0 top-8 z-50 w-52 rounded shadow-lg overflow-hidden"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <p
          className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}
        >
          Move to
        </p>

        {/* Root option */}
        <CollectionOption
          label="Root (no collection)"
          depth={0}
          isSelected={currentCollectionId === null}
          onSelect={() => onMove(null)}
        />

        {flat.map(({ collection, depth }) => (
          <CollectionOption
            key={collection.id}
            label={collection.name}
            depth={depth + 1}
            isSelected={currentCollectionId === collection.id}
            onSelect={() => onMove(collection.id)}
          />
        ))}

        {flat.length === 0 && (
          <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            No collections yet
          </p>
        )}
      </div>
    </>
  );
}

interface CollectionOptionProps {
  label: string;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
}

function CollectionOption({ label, depth, isSelected, onSelect }: CollectionOptionProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full py-2 pr-3 text-xs text-left transition-colors flex items-center gap-1"
      style={{
        paddingLeft: 12 + depth * 12,
        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
        backgroundColor: isSelected ? 'var(--border-light)' : 'transparent',
        fontWeight: isSelected ? 600 : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-light)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {isSelected && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
