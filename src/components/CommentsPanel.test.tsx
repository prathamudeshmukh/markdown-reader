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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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

  it('defaults to Open tab showing only unresolved comments', () => {
    render(<CommentsPanel {...defaultProps} />);
    expect(screen.getByText('Open comment')).toBeInTheDocument();
    expect(screen.queryByText('Resolved comment')).not.toBeInTheDocument();
  });

  it('shows resolved comments when Resolved tab is selected', () => {
    render(<CommentsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /resolved/i }));
    expect(screen.getByText('Resolved comment')).toBeInTheDocument();
    expect(screen.queryByText('Open comment')).not.toBeInTheDocument();
  });

  it('shows empty state message when no open comments', () => {
    render(<CommentsPanel {...defaultProps} comments={[resolvedComment]} />);
    expect(screen.getByText(/no open comments/i)).toBeInTheDocument();
  });

  it('shows empty state message when no resolved comments', () => {
    render(<CommentsPanel {...defaultProps} comments={[openComment]} />);
    fireEvent.click(screen.getByRole('button', { name: /resolved/i }));
    expect(screen.getByText(/no resolved comments/i)).toBeInTheDocument();
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
    render(<CommentsPanel {...defaultProps} unresolvedCount={0} comments={[resolvedComment]} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows a confirmation modal when doc owner clicks Delete — does not immediately call onDelete', () => {
    const onDelete = vi.fn();
    render(<CommentsPanel {...defaultProps} isDocOwner={true} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onDelete with comment id when deletion is confirmed in modal', () => {
    const onDelete = vi.fn();
    render(<CommentsPanel {...defaultProps} isDocOwner={true} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('does not call onDelete and closes modal when cancel is clicked', () => {
    const onDelete = vi.fn();
    render(<CommentsPanel {...defaultProps} isDocOwner={true} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
