import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
];

function avatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
  user: User;
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initial = (user.email ?? '?')[0].toUpperCase();
  const color = avatarColor(user.email ?? '');

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-semibold shrink-0 focus:outline-none focus:ring-2"
        style={{ backgroundColor: color }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl p-1.5 shadow-xl z-50 animate-fade-in"
          style={{
            backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
            border: '1px solid var(--border)',
          }}
        >
          <div className="px-3 py-2">
            <p
              className="text-xs font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {user.email}
            </p>
          </div>

          <div className="my-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />

          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
