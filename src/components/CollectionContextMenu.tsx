interface CollectionContextMenuProps {
  collectionName: string;
  onNewDoc: () => void;
  onNewSubCollection: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function CollectionContextMenu({
  collectionName,
  onNewDoc,
  onNewSubCollection,
  onRename,
  onDelete,
  onClose,
}: CollectionContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute right-0 top-8 z-50 w-44 rounded shadow-lg overflow-hidden"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        role="menu"
      >
        <MenuItem label="New doc here" onClick={onNewDoc} />
        <MenuItem label="New sub-collection" onClick={onNewSubCollection} />
        <div style={{ height: '1px', backgroundColor: 'var(--border-light)', margin: '2px 0' }} />
        <MenuItem label="Rename" onClick={onRename} />
        <MenuItem label={`Delete "${collectionName}"`} onClick={onDelete} isDanger />
      </div>
    </>
  );
}

interface MenuItemProps {
  label: string;
  onClick: () => void;
  isDanger?: boolean;
}

function MenuItem({ label, onClick, isDanger = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 text-xs text-left transition-colors"
      style={{ color: isDanger ? '#dc2626' : 'var(--text-primary)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDanger ? '#fef2f2' : 'var(--border-light)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
      role="menuitem"
    >
      {label}
    </button>
  );
}
