import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecentDocsSidebar from './RecentDocsSidebar';
import type { DisplayDoc } from '../hooks/useRecentDocs';

const sampleDocs: DisplayDoc[] = [
  { slug: 'abc1234', title: 'My First Doc', savedAt: '2026-03-12T15:40:00.000Z', collectionId: null },
  { slug: 'xyz9999', title: null, savedAt: '2026-03-11T09:12:00.000Z', collectionId: null },
];

const onClose = vi.fn();

describe('RecentDocsSidebar', () => {
  it('shows empty state when no docs', () => {
    render(<RecentDocsSidebar docs={[]} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('No saved docs yet')).toBeInTheDocument();
  });

  it('renders title when available', () => {
    render(<RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('My First Doc')).toBeInTheDocument();
  });

  it('renders slug when title is null', () => {
    render(<RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('xyz9999')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Recent Docs')).toBeInTheDocument();
  });

  it('shows mobile backdrop when open', () => {
    render(<RecentDocsSidebar docs={[]} isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('mobile-backdrop')).toBeInTheDocument();
  });

  it('hides mobile backdrop when closed', () => {
    render(<RecentDocsSidebar docs={[]} isOpen={false} onClose={onClose} />);
    expect(screen.queryByTestId('mobile-backdrop')).not.toBeInTheDocument();
  });

  it('calls onDocOpen when a doc is opened', () => {
    const onDocOpen = vi.fn();
    render(
      <RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} onDocOpen={onDocOpen} />,
    );
    fireEvent.click(screen.getByText('My First Doc'));
    expect(onDocOpen).toHaveBeenCalledOnce();
  });
});
