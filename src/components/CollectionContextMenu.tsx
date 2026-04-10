import { NewDocIcon, NewFolderIcon, RenameIcon, DeleteIcon } from './SidebarIcons';

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
        className="absolute right-0 top-7 z-50 w-48 rounded-lg overflow-hidden py-1"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        }}
        role="menu"
      >
        <MenuItem label="New doc here" icon={<NewDocIcon />} onClick={onNewDoc} />
        <MenuItem label="New sub-collection" icon={<NewFolderIcon />} onClick={onNewSubCollection} />
        <div style={{ height: '1px', backgroundColor: 'var(--border-light)', margin: '4px 8px' }} />
        <MenuItem label="Rename" icon={<RenameIcon />} onClick={onRename} />
        <MenuItem
          label={`Delete "${collectionName}"`}
          icon={<DeleteIcon />}
          onClick={onDelete}
          isDanger
        />
      </div>
    </>
  );
}

interface MenuItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isDanger?: boolean;
}

function MenuItem({ label, icon, onClick, isDanger = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-1.5 text-xs text-left transition-colors flex items-center gap-2.5"
      style={{ color: isDanger ? '#dc2626' : 'var(--text-primary)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDanger
          ? 'rgba(220,38,38,0.06)'
          : 'var(--border-light)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
      role="menuitem"
    >
      <span className="shrink-0" style={{ opacity: isDanger ? 1 : 0.65 }}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
