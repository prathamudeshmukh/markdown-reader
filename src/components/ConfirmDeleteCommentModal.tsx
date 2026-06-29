import { useEffect } from 'react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteCommentModal({ onConfirm, onCancel }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete comment"
        className="w-full max-w-xs rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Delete comment?
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          This action cannot be undone.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Cancel"
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Confirm delete"
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
