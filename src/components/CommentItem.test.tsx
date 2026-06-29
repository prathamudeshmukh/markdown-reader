import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CommentItem from './CommentItem';
import type { Comment } from '../types/comments';

const baseComment: Comment = {
  id: 'c1',
  docSlug: 'doc123',
  userId: null,
  authorName: 'Alice',
  content: 'This is a comment',
  anchorText: null,
  resolved: false,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

describe('CommentItem', () => {
  it('renders author name and content', () => {
    render(
      <CommentItem
        comment={baseComment}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('This is a comment')).toBeInTheDocument();
  });

  it('always shows Resolve button (never hover-gated)', () => {
    render(
      <CommentItem
        comment={baseComment}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });

  it('shows Unresolve button when comment is resolved', () => {
    render(
      <CommentItem
        comment={{ ...baseComment, resolved: true }}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByRole('button', { name: /unresolve/i })).toBeInTheDocument();
  });

  it('calls onResolve with true when Resolve is clicked', () => {
    const onResolve = vi.fn();
    render(
      <CommentItem
        comment={baseComment}
        isDocOwner={false}
        onResolve={onResolve}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect(onResolve).toHaveBeenCalledWith('c1', true);
  });

  it('shows Delete button only for doc owner', () => {
    const { rerender } = render(
      <CommentItem
        comment={baseComment}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    rerender(
      <CommentItem
        comment={baseComment}
        isDocOwner={true}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <CommentItem
        comment={baseComment}
        isDocOwner={true}
        onResolve={vi.fn()}
        onDelete={onDelete}
        previewText={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('shows stale anchor blockquote when anchorText is set but not found in preview', () => {
    render(
      <CommentItem
        comment={{ ...baseComment, anchorText: 'original passage' }}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByText('original passage')).toBeInTheDocument();
  });

  it('does not show stale blockquote when anchorText is null', () => {
    render(
      <CommentItem
        comment={{ ...baseComment, anchorText: null }}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument();
  });

  it('renders relative timestamp', () => {
    render(
      <CommentItem
        comment={baseComment}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('renders author initials in avatar for multi-word name', () => {
    render(
      <CommentItem
        comment={{ ...baseComment, authorName: 'Sarah Kim' }}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByText('SK')).toBeInTheDocument();
  });

  it('shows Resolved badge when comment is resolved', () => {
    render(
      <CommentItem
        comment={{ ...baseComment, resolved: true }}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('applies line-through class to content when resolved', () => {
    const { container } = render(
      <CommentItem
        comment={{ ...baseComment, resolved: true, content: 'Resolved content' }}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        previewText={null}
      />,
    );

    const contentEl = container.querySelector('[data-testid="comment-content"]');
    expect(contentEl).toHaveClass('line-through');
  });
});
