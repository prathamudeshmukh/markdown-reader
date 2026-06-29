import { useState } from 'react';
import type { CreateCommentInput } from '../types/comments';

interface CommentFormProps {
  anchorText: string | null;
  onSubmit: (input: CreateCommentInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  authorName?: string;
}

const MAX_CONTENT = 2000;
const MAX_NAME = 100;
const COUNTER_THRESHOLD = 1800;
const ANCHOR_PREVIEW_LENGTH = 120;

export default function CommentForm({ anchorText, onSubmit, onCancel, isSubmitting, authorName }: CommentFormProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && !isSubmitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ content: trimmedContent, authorName: authorName ?? name.trim(), anchorText });
  }

  const anchorPreview = anchorText
    ? anchorText.length > ANCHOR_PREVIEW_LENGTH
      ? `${anchorText.slice(0, ANCHOR_PREVIEW_LENGTH)}…`
      : anchorText
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      {anchorPreview && (
        <blockquote
          className="pl-3 text-xs italic"
          style={{ borderLeft: '2px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {anchorPreview}
        </blockquote>
      )}

      {authorName === undefined && (
        <div className="flex flex-col gap-1">
          <label htmlFor="comment-author" className="sr-only">Your name</label>
          <input
            id="comment-author"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
            placeholder="Anonymous"
            className="w-full px-3 py-2 text-sm rounded-md border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="comment-content" className="sr-only">Comment</label>
        <textarea
          id="comment-content"
          aria-label="Comment"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
          placeholder="Add a comment…"
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-md border resize-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        {content.length > COUNTER_THRESHOLD && (
          <span className="text-xs self-end" style={{ color: 'var(--text-muted)' }}>
            {content.length} / {MAX_CONTENT}
          </span>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
