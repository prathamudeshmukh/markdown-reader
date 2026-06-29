import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CommentsPanel from './CommentsPanel';
import type { Comment } from '../types/comments';

const openComment: Comment = {
  id: 'c1',
  docSlug: 'doc123',
  userId: null,
  authorName: 'Alice',
  content: 'Open comment',
  anchorText: null,
  resolved: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const resolvedComment: Comment = {
  id: 'c2',
  docSlug: 'doc123',
  userId: null,
  authorName: 'Bob',
  content: 'Resolved comment',
  anchorText: null,
  resolved: true,
  createdAt: '2026-01-01T01:00:00.000Z',
  updatedAt: '2026-01-01T01:00:00.000Z',
};

const defaultProps = {
  comments: [openComment, resolvedComment],
  isDocOwner: false,
  onClose: vi.fn(),
  onResolve: vi.fn(),
  onDelete: vi.fn(),
  previewText: null,
};

describe('CommentsPanel', () => {
  it('shows "Comments" heading', () => {
    render(<CommentsPanel {...defaultProps} />);
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('shows all comments (open and resolved) together without tabs', () => {
    render(<CommentsPanel {...defaultProps} />);
    expect(screen.getByText('Open comment')).toBeInTheDocument();
    expect(screen.getByText('Resolved comment')).toBeInTheDocument();
  });

  it('does not render Open or Resolved tab buttons', () => {
    render(<CommentsPanel {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /^open$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^resolved$/i })).not.toBeInTheDocument();
  });

  it('shows "No comments yet" when comments array is empty', () => {
    render(<CommentsPanel {...defaultProps} comments={[]} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<CommentsPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows unresolved count badge when count > 0', () => {
    render(<CommentsPanel {...defaultProps} unresolvedCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show badge when unresolved count is 0', () => {
    render(<CommentsPanel {...defaultProps} unresolvedCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
