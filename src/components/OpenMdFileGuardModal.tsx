interface OpenMdFileGuardModalProps {
  open: boolean;
  onSaveAndOpen: () => void;
  onDiscardAndOpen: () => void;
  onCancel: () => void;
}

export default function OpenMdFileGuardModal({
  open,
  onSaveAndOpen,
  onDiscardAndOpen,
  onCancel,
}: OpenMdFileGuardModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Unsaved changes"
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-base font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Unsaved changes
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          You have unsaved changes. Save before opening a new file?
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onSaveAndOpen}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
          >
            Save &amp; Open
          </button>
          <button
            onClick={onDiscardAndOpen}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            Discard &amp; Open
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
