import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CommentTooltip from './CommentTooltip';
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

describe('CommentTooltip', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, // fine pointer = desktop
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders all comments for the anchor', () => {
    render(
      <CommentTooltip
        comments={[mockComment]}
        anchorRect={{ top: 100, left: 200, bottom: 120, right: 300, width: 100, height: 20 } as DOMRect}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Great point')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('dismisses on Escape key press', () => {
    const onClose = vi.fn();
    render(
      <CommentTooltip
        comments={[mockComment]}
        anchorRect={{ top: 100, left: 200, bottom: 120, right: 300, width: 100, height: 20 } as DOMRect}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Resolve button for each comment', () => {
    render(
      <CommentTooltip
        comments={[mockComment]}
        anchorRect={{ top: 100, left: 200, bottom: 120, right: 300, width: 100, height: 20 } as DOMRect}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });

  it('shows Delete button only when isDocOwner is true', () => {
    const { rerender } = render(
      <CommentTooltip
        comments={[mockComment]}
        anchorRect={{ top: 100, left: 200, bottom: 120, right: 300, width: 100, height: 20 } as DOMRect}
        isDocOwner={false}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    rerender(
      <CommentTooltip
        comments={[mockComment]}
        anchorRect={{ top: 100, left: 200, bottom: 120, right: 300, width: 100, height: 20 } as DOMRect}
        isDocOwner={true}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});
