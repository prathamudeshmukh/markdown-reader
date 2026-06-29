import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CommentBottomSheet from './CommentBottomSheet';
import type { Comment } from '../types/comments';

const mockComment: Comment = {
  id: 'c1',
  docSlug: 'doc123',
  userId: null,
  authorName: 'Alice',
  content: 'Great point',
  anchorText: 'selected text',
  resolved: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CommentBottomSheet', () => {
  it('renders all comments for the anchor', () => {
    render(
      <CommentBottomSheet
        comments={[mockComment]}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Great point')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('closes when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <CommentBottomSheet
        comments={[mockComment]}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when drag handle is clicked', () => {
    const onClose = vi.fn();
    render(
      <CommentBottomSheet
        comments={[mockComment]}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Resolve button for each comment', () => {
    render(
      <CommentBottomSheet
        comments={[mockComment]}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });
});
