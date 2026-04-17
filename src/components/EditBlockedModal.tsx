import { useEffect } from 'react';

interface Props {
  isUnowned: boolean;
  onClose: () => void;
  onFork: () => void;
  onSignIn: () => void;
}

export default function EditBlockedModal({ isUnowned, onClose, onFork, onSignIn }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Document is read-only"
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {isUnowned ? 'This document has no owner' : 'This document is read-only'}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {isUnowned
            ? 'Make a copy to edit it freely.'
            : "You're viewing someone else's document. Make a copy to edit freely, or sign in as the owner."}
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            onClick={onFork}
          >
            Make a copy
          </button>
          {!isUnowned && (
            <button
              type="button"
              className="w-full py-2 text-sm font-medium rounded-lg"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onClick={onSignIn}
            >
              Sign in to edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
