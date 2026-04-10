import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VirtualUnsortedNode from './VirtualUnsortedNode';
import type { DocSummary } from '../api/docsApi';
import type { CollectionTree } from '../types/collections';

const doc1: DocSummary = {
  slug: 'doc-alpha',
  title: 'Alpha Doc',
  collectionId: null,
  updatedAt: '2026-03-20T10:00:00.000Z',
};

const doc2: DocSummary = {
  slug: 'doc-beta',
  title: null,
  collectionId: null,
  updatedAt: '2026-03-19T08:30:00.000Z',
};

const tree: CollectionTree = {
  rootDocs: [doc1, doc2],
  rootCollections: [],
};

function makeProps(overrides: Partial<Parameters<typeof VirtualUnsortedNode>[0]> = {}) {
  return {
    docs: [doc1, doc2],
    isExpanded: true,
    currentSlug: null as string | null,
    tree,
    onToggle: vi.fn(),
    onNavigateToDoc: vi.fn(),
    onMoveDoc: vi.fn(),
    ...overrides,
  };
}

describe('VirtualUnsortedNode', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('structure', () => {
    it('renders the "Unsorted" label', () => {
      render(<VirtualUnsortedNode {...makeProps()} />);
      expect(screen.getByText('Unsorted')).toBeInTheDocument();
    });

    it('does not render a collection-level options (kebab) button', () => {
      render(<VirtualUnsortedNode {...makeProps()} />);
      // DocRow buttons are labelled "Doc options" — the node itself must have no "Collection options"
      expect(screen.queryByLabelText(/collection options/i)).not.toBeInTheDocument();
    });

    it('shows a doc count badge matching the number of docs', () => {
      render(<VirtualUnsortedNode {...makeProps()} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders all docs when expanded', () => {
      render(<VirtualUnsortedNode {...makeProps({ isExpanded: true })} />);
      expect(screen.getByText('Alpha Doc')).toBeInTheDocument();
      expect(screen.getByText('doc-beta')).toBeInTheDocument();
    });

    it('shows correct count with a single doc', () => {
      render(<VirtualUnsortedNode {...makeProps({ docs: [doc1] })} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('toggle interaction', () => {
    it('calls onToggle when the "Unsorted" label is clicked', () => {
      const onToggle = vi.fn();
      render(<VirtualUnsortedNode {...makeProps({ onToggle })} />);
      fireEvent.click(screen.getByText('Unsorted'));
      expect(onToggle).toHaveBeenCalledOnce();
    });

    it('calls onToggle when the chevron button is clicked', () => {
      const onToggle = vi.fn();
      render(<VirtualUnsortedNode {...makeProps({ onToggle })} />);
      fireEvent.click(screen.getByLabelText(/collapse unsorted/i));
      expect(onToggle).toHaveBeenCalledOnce();
    });

    it('chevron aria-label reflects collapsed state', () => {
      render(<VirtualUnsortedNode {...makeProps({ isExpanded: false })} />);
      expect(screen.getByLabelText(/expand unsorted/i)).toBeInTheDocument();
    });

    it('chevron aria-label reflects expanded state', () => {
      render(<VirtualUnsortedNode {...makeProps({ isExpanded: true })} />);
      expect(screen.getByLabelText(/collapse unsorted/i)).toBeInTheDocument();
    });
  });

  describe('doc navigation', () => {
    it('calls onNavigateToDoc with the correct slug when a titled doc is clicked', () => {
      const onNavigateToDoc = vi.fn();
      render(<VirtualUnsortedNode {...makeProps({ onNavigateToDoc })} />);
      fireEvent.click(screen.getByRole('button', { name: /alpha doc/i }));
      expect(onNavigateToDoc).toHaveBeenCalledWith('doc-alpha');
    });

    it('calls onNavigateToDoc with the correct slug for a slug-only doc', () => {
      const onNavigateToDoc = vi.fn();
      render(<VirtualUnsortedNode {...makeProps({ onNavigateToDoc })} />);
      fireEvent.click(screen.getByRole('button', { name: /doc-beta/i }));
      expect(onNavigateToDoc).toHaveBeenCalledWith('doc-beta');
    });
  });

  describe('active doc highlighting', () => {
    it('marks the active doc with the accent left border', () => {
      render(<VirtualUnsortedNode {...makeProps({ currentSlug: 'doc-alpha' })} />);
      const btn = screen.getByRole('button', { name: /alpha doc/i });
      expect(btn.style.borderLeft).toContain('var(--accent)');
    });

    it('does not mark inactive docs with the accent border', () => {
      render(<VirtualUnsortedNode {...makeProps({ currentSlug: 'doc-alpha' })} />);
      const btn = screen.getByRole('button', { name: /doc-beta/i });
      expect(btn.style.borderLeft).toContain('transparent');
    });

    it('no doc is marked active when currentSlug is null', () => {
      render(<VirtualUnsortedNode {...makeProps({ currentSlug: null })} />);
      const btn = screen.getByRole('button', { name: /alpha doc/i });
      expect(btn.style.borderLeft).toContain('transparent');
    });
  });
});
