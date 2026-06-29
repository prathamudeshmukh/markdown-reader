import type { Comment } from '../types/comments';
import CommentItem from './CommentItem';

interface CommentsPanelProps {
  comments: Comment[];
  isDocOwner: boolean;
  onClose: () => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  previewText: string | null;
  unresolvedCount?: number;
}

export default function CommentsPanel({
  comments,
  isDocOwner,
  onClose,
  onResolve,
  onDelete,
  previewText,
  unresolvedCount = 0,
}: CommentsPanelProps) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Comments
          </h2>
          {unresolvedCount > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {unresolvedCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close comments panel"
          className="flex items-center justify-center w-7 h-7 rounded-md transition-colors text-base leading-none"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            No comments yet
          </div>
        ) : (
          comments.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isDocOwner={isDocOwner}
              onResolve={onResolve}
              onDelete={onDelete}
              previewText={previewText}
              isLast={index === comments.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
