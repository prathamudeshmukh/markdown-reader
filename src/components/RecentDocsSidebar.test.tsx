import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecentDocsSidebar from './RecentDocsSidebar';
import type { RecentDoc } from '../utils/recentDocs';

const sampleDocs: RecentDoc[] = [
  { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
  { slug: 'xyz9999', savedAt: '2026-03-11T09:12:00.000Z' },
];

const onClose = vi.fn();

describe('RecentDocsSidebar', () => {
  it('shows empty state when no docs', () => {
    render(<RecentDocsSidebar docs={[]} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('No saved docs yet')).toBeInTheDocument();
  });

  it('renders all doc slugs', () => {
    render(<RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('xyz9999')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Recent Docs')).toBeInTheDocument();
  });

  it('shows mobile backdrop when open', () => {
    render(<RecentDocsSidebar docs={[]} isOpen={true} onClose={onClose} />);
    expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('hides mobile backdrop when closed', () => {
    render(<RecentDocsSidebar docs={[]} isOpen={false} onClose={onClose} />);
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('calls onDocOpen when a doc is opened', () => {
    const onDocOpen = vi.fn();
    render(
      <RecentDocsSidebar docs={sampleDocs} isOpen={true} onClose={onClose} onDocOpen={onDocOpen} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /abc1234/i }));
    expect(onDocOpen).toHaveBeenCalledOnce();
  });
});
