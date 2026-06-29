import { useState } from 'react';
import type { Comment } from '../types/comments';
import CommentItem from './CommentItem';

type Tab = 'open' | 'resolved';

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
  const [activeTab, setActiveTab] = useState<Tab>('open');

  const visibleComments = comments.filter((c) =>
    activeTab === 'open' ? !c.resolved : c.resolved,
  );

  const TAB_BASE =
    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors';
  const TAB_ACTIVE = 'text-[var(--accent)] bg-[var(--bg-secondary)]';
  const TAB_INACTIVE = 'text-[var(--text-muted)] hover:text-[var(--text-primary)]';

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Comments
          </h2>
          {unresolvedCount > 0 && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {unresolvedCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close comments panel"
          className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 pb-1 shrink-0">
        <button
          onClick={() => setActiveTab('open')}
          aria-label="Open"
          className={`${TAB_BASE} ${activeTab === 'open' ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Open
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          aria-label="Resolved"
          className={`${TAB_BASE} ${activeTab === 'resolved' ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Resolved
        </button>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto">
        {visibleComments.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {activeTab === 'open' ? 'No open comments' : 'No resolved comments'}
          </div>
        ) : (
          visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isDocOwner={isDocOwner}
              onResolve={onResolve}
              onDelete={onDelete}
              previewText={previewText}
            />
          ))
        )}
      </div>
    </div>
  );
}
