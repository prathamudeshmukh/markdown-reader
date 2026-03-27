import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocRow from './DocRow';
import type { DocSummary } from '../api/docsApi';

const docWithTitle: DocSummary = {
  slug: 'abc1234',
  title: 'My Doc',
  collectionId: null,
  updatedAt: '2026-03-20T10:00:00.000Z',
};

const docWithoutTitle: DocSummary = {
  slug: 'xyz9999',
  title: null,
  collectionId: 'col-1',
  updatedAt: '2026-03-19T08:30:00.000Z',
};

function makeProps(overrides: Partial<Parameters<typeof DocRow>[0]> = {}) {
  return {
    doc: docWithTitle,
    isActive: false,
    depth: 0,
    onNavigateToDoc: vi.fn(),
    onMoveDoc: vi.fn(),
    ...overrides,
  };
}

describe('DocRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigation', () => {
    it('calls onNavigateToDoc with the doc slug when clicked', () => {
      const onNavigateToDoc = vi.fn();
      render(<DocRow {...makeProps({ onNavigateToDoc })} />);

      fireEvent.click(screen.getByRole('button', { name: /my doc/i }));

      expect(onNavigateToDoc).toHaveBeenCalledWith('abc1234');
    });

    it('does not mutate window.location.href on click', () => {
      const originalHref = window.location.href;
      render(<DocRow {...makeProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /my doc/i }));

      expect(window.location.href).toBe(originalHref);
    });

    it('calls onNavigateToDoc with the correct slug for a doc without a title', () => {
      const onNavigateToDoc = vi.fn();
      render(<DocRow {...makeProps({ doc: docWithoutTitle, onNavigateToDoc })} />);

      fireEvent.click(screen.getByRole('button', { name: /xyz9999/i }));

      expect(onNavigateToDoc).toHaveBeenCalledWith('xyz9999');
    });
  });

  describe('rendering', () => {
    it('renders title and slug when title is set', () => {
      render(<DocRow {...makeProps()} />);
      expect(screen.getByText('My Doc')).toBeInTheDocument();
      expect(screen.getByText('abc1234')).toBeInTheDocument();
    });

    it('renders only slug when title is null', () => {
      render(<DocRow {...makeProps({ doc: docWithoutTitle })} />);
      expect(screen.getByText('xyz9999')).toBeInTheDocument();
      expect(screen.queryByText('My Doc')).not.toBeInTheDocument();
    });

    it('renders formatted date', () => {
      render(<DocRow {...makeProps()} />);
      expect(screen.getByRole('time')).toBeInTheDocument();
    });

    it('applies active border style when isActive is true', () => {
      render(<DocRow {...makeProps({ isActive: true })} />);
      const button = screen.getByRole('button', { name: /my doc/i });
      expect(button.style.borderLeft).toContain('var(--accent)');
    });

    it('applies transparent border style when isActive is false', () => {
      render(<DocRow {...makeProps({ isActive: false })} />);
      const button = screen.getByRole('button', { name: /my doc/i });
      expect(button.style.borderLeft).toContain('transparent');
    });
  });
});
