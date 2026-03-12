import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecentDocsDropdown from './RecentDocsDropdown';
import type { RecentDoc } from '../utils/recentDocs';

const docs: RecentDoc[] = [
  { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
  { slug: 'xyz9999', savedAt: '2026-03-11T09:12:00.000Z' },
];

describe('RecentDocsDropdown', () => {
  it('renders each slug', () => {
    render(<RecentDocsDropdown docs={docs} onClose={vi.fn()} />);
    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('xyz9999')).toBeInTheDocument();
  });

  it('renders a formatted timestamp for each doc', () => {
    render(<RecentDocsDropdown docs={docs} onClose={vi.fn()} />);
    // Timestamps rendered — just check they appear (locale-dependent format)
    const timeEls = screen.getAllByRole('time');
    expect(timeEls).toHaveLength(2);
  });

  it('shows empty state when docs is empty', () => {
    render(<RecentDocsDropdown docs={[]} onClose={vi.fn()} />);
    expect(screen.getByText('No saved docs yet')).toBeInTheDocument();
  });

  it('clicking a row navigates to the correct URL', () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
    render(<RecentDocsDropdown docs={docs} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('abc1234'));
    expect(window.location.href).toBe('/mreader/d/abc1234');
  });

  it('calls onClose when mousedown occurs outside the dropdown', () => {
    const onClose = vi.fn();
    render(
      <div>
        <RecentDocsDropdown docs={docs} onClose={onClose} />
        <button data-testid="outside">outside</button>
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when mousedown occurs inside the dropdown', () => {
    const onClose = vi.fn();
    render(<RecentDocsDropdown docs={docs} onClose={onClose} />);
    fireEvent.mouseDown(screen.getByText('abc1234'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
