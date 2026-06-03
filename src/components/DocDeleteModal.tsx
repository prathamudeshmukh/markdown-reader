import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DocDeleteModalProps {
  docTitle: string | null;
  docSlug: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DocDeleteModal({ docTitle, docSlug, isDeleting, onConfirm, onCancel }: DocDeleteModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const label = docTitle ?? docSlug;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete document"
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Delete &quot;{label}&quot;?
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          This cannot be undone.
        </p>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={isDeleting}
            className="px-4 py-2 text-sm rounded-lg"
            style={{
              backgroundColor: 'var(--border-light)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: '#dc2626', color: '#fff' }}
            onClick={onConfirm}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
