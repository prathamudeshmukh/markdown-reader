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

  const tabStyle = (tab: Tab) => ({
    backgroundColor: activeTab === tab ? 'var(--accent)' : 'var(--bg-secondary)',
    color: activeTab === tab ? 'white' : 'var(--text-muted)',
  });

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

      {/* Pill tabs */}
      <div className="flex gap-2 px-4 pt-2.5 pb-2.5 shrink-0">
        <button
          onClick={() => setActiveTab('open')}
          aria-label="Open"
          className="px-4 py-1 text-xs font-semibold rounded-full transition-colors"
          style={tabStyle('open')}
        >
          Open
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          aria-label="Resolved"
          className="px-4 py-1 text-xs font-semibold rounded-full transition-colors"
          style={tabStyle('resolved')}
        >
          Resolved
        </button>
      </div>

      <div className="shrink-0" style={{ height: '1px', backgroundColor: 'var(--border-light)' }} />

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
          visibleComments.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isDocOwner={isDocOwner}
              onResolve={onResolve}
              onDelete={onDelete}
              previewText={previewText}
              isLast={index === visibleComments.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
