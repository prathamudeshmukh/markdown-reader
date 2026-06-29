import { useState } from 'react';
import type { Comment } from '../types/comments';

interface CommentItemProps {
  comment: Comment;
  isDocOwner: boolean;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  previewText: string | null;
  isLast?: boolean;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#06b6d4)',
  'linear-gradient(135deg,#22c55e,#16a34a)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#be185d)',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_GRADIENTS.length;
  }
  return AVATAR_GRADIENTS[hash];
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function CommentItem({
  comment,
  isDocOwner,
  onResolve,
  onDelete,
  previewText,
  isLast = false,
}: CommentItemProps) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const showStaleAnchor = comment.anchorText !== null && previewText === null;
  const initials = getInitials(comment.authorName);
  const gradient = avatarGradient(comment.authorName);

  return (
    <div className="flex gap-3 px-4 py-3">
      {/* Avatar column with thread line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: gradient }}
        >
          {initials}
        </div>
        {!isLast && (
          <div
            className="flex-1 w-px mt-1 min-h-4"
            style={{ backgroundColor: 'var(--border)' }}
          />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 pb-3 min-w-0">
        {/* Author row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {comment.authorName}
          </span>

          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {showStaleAnchor && (
          <blockquote
            className="my-1.5 pl-2.5 text-xs italic"
            style={{ borderLeft: '2px solid var(--border)', color: 'var(--text-muted)' }}
          >
            {comment.anchorText}
          </blockquote>
        )}

        <p
          data-testid="comment-content"
          className={`text-xs mb-2.5 whitespace-pre-wrap break-words leading-relaxed${comment.resolved ? ' line-through' : ''}`}
          style={{ color: comment.resolved ? 'var(--text-muted)' : 'var(--text-secondary)' }}
        >
          {comment.content}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onResolve(comment.id, !comment.resolved)}
            aria-label={comment.resolved ? 'Unresolve' : 'Resolve'}
            className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: comment.resolved ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {comment.resolved ? 'Unresolve' : 'Resolve'}
          </button>

          {isDocOwner && !pendingDelete && (
            <button
              onClick={() => setPendingDelete(true)}
              aria-label="Delete"
              className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
              style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
            >
              Delete
            </button>
          )}

          {isDocOwner && pendingDelete && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Delete?
              </span>
              <button
                onClick={() => onDelete(comment.id)}
                aria-label="Confirm"
                className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setPendingDelete(false)}
                aria-label="Cancel"
                className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
