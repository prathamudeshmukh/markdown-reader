import type { Comment } from '../types/comments';
import CommentItem from './CommentItem';

interface CommentBottomSheetProps {
  comments: Comment[];
  isDocOwner: boolean;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function CommentBottomSheet({
  comments,
  isDocOwner,
  onResolve,
  onDelete,
  onClose,
}: CommentBottomSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Comments"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
          border: '1px solid var(--border)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle + close */}
        <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="flex flex-col items-center gap-1 w-full pb-1"
          >
            <div
              className="rounded-full"
              style={{ width: 32, height: 4, backgroundColor: 'var(--border)' }}
            />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto">
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
      </div>
    </>
  );
}
