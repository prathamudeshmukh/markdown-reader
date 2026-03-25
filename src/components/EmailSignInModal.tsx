import { useEffect, useRef, useState } from 'react';

type ModalState = 'idle' | 'loading' | 'sent' | 'error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  onClose: () => void;
  onSubmit: (email: string) => Promise<{ error: string | null }>;
}

export default function EmailSignInModal({ onClose, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<ModalState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) return;

    setState('loading');
    const { error } = await onSubmit(email);

    if (error) {
      setErrorMessage(error);
      setState('error');
    } else {
      setState('sent');
    }
  }

  return (
    <div
      data-testid="signin-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Sign in
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Enter your email and we'll send you a magic link.
        </p>

        {state === 'sent' ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Check your email — we sent you a link.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              You can close this window.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="signin-email"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email
            </label>
            <input
              ref={inputRef}
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 mb-3"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />

            {state === 'error' && (
              <p className="text-xs mb-3 text-red-500">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full py-2 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
              }}
            >
              {state === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
