import { useEffect, useRef } from 'react';
import type { Comment } from '../types/comments';
import CommentItem from './CommentItem';
import { useClickOutside } from '../hooks/useClickOutside';

interface CommentTooltipProps {
  comments: Comment[];
  anchorRect: DOMRect;
  isDocOwner: boolean;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_MAX_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;

function clampPosition(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function CommentTooltip({
  comments,
  anchorRect,
  isDocOwner,
  onResolve,
  onDelete,
  onClose,
}: CommentTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  useClickOutside(tooltipRef, true, onClose);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const top = anchorRect.bottom + 8;
  const rawLeft = anchorRect.left + anchorRect.width / 2 - TOOLTIP_WIDTH / 2;
  const left = clampPosition(
    rawLeft,
    VIEWPORT_MARGIN,
    window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
  );

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-label="Comments"
      className="fixed z-50 rounded-xl shadow-xl overflow-hidden"
      style={{
        top,
        left,
        width: TOOLTIP_WIDTH,
        maxHeight: TOOLTIP_MAX_HEIGHT,
        backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
        border: '1px solid var(--border)',
        overflowY: 'auto',
      }}
    >
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isDocOwner={isDocOwner}
          onResolve={onResolve}
          onDelete={onDelete}
          previewText={null}
        />
      ))}
    </div>
  );
}
