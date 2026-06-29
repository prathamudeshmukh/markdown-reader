interface AddCommentButtonProps {
  top: number;
  left: number;
  onClick: () => void;
}

export default function AddCommentButton({ top, left, onClick }: AddCommentButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Add comment"
      className="fixed z-40 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full shadow-lg transition-all duration-150"
      style={{
        top,
        left,
        backgroundColor: 'var(--accent)',
        color: 'white',
        transform: 'translateX(-50%)',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Add comment
    </button>
  );
}
