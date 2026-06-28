interface EditAccessToggleProps {
  isOwner: boolean;
  editAccess: boolean;
  onToggle: (value: boolean) => void;
  pending?: boolean;
}

export default function EditAccessToggle({ isOwner, editAccess, onToggle, pending = false }: EditAccessToggleProps) {
  if (!isOwner) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Allow editing
      </span>
      <button
        role="switch"
        aria-checked={editAccess}
        aria-label={editAccess ? 'Disable public editing' : 'Enable public editing'}
        disabled={pending}
        onClick={() => onToggle(!editAccess)}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{
          backgroundColor: editAccess ? 'var(--accent)' : 'var(--bg-elevated)',
          border: editAccess ? undefined : '1px solid var(--border)',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out"
          style={{ transform: editAccess ? 'translateX(16px)' : 'translateX(0px)' }}
        />
      </button>
    </div>
  );
}
