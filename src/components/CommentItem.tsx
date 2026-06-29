import type { Comment } from '../types/comments';

interface CommentItemProps {
  comment: Comment;
  isDocOwner: boolean;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  previewText: string | null;
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

const ACTION_BTN =
  'min-h-[44px] min-w-[44px] px-3 py-2 text-xs rounded-md transition-colors ' +
  'flex items-center justify-center';

export default function CommentItem({ comment, isDocOwner, onResolve, onDelete, previewText }: CommentItemProps) {
  const showStaleAnchor = comment.anchorText !== null && previewText === null;

  return (
    <div className="py-3 px-4 border-b last:border-b-0" style={{ borderColor: 'var(--border-light)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {comment.authorName}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>

      {showStaleAnchor && (
        <blockquote
          className="my-2 pl-3 text-xs italic"
          style={{
            borderLeft: '2px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          {comment.anchorText}
        </blockquote>
      )}

      <p className="text-sm mb-3 whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
        {comment.content}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onResolve(comment.id, !comment.resolved)}
          aria-label={comment.resolved ? 'Unresolve' : 'Resolve'}
          className={`${ACTION_BTN} text-xs font-medium`}
          style={{ color: comment.resolved ? 'var(--accent)' : 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)' }}
        >
          {comment.resolved ? 'Unresolve' : 'Resolve'}
        </button>

        {isDocOwner && (
          <button
            onClick={() => onDelete(comment.id)}
            aria-label="Delete"
            className={`${ACTION_BTN} text-xs font-medium`}
            style={{ color: '#ef4444', backgroundColor: 'var(--bg-secondary)' }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
