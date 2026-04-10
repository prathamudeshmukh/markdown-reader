import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionsSidebar from './CollectionsSidebar';
import type { CollectionTree } from '../types/collections';
import type { DocSummary } from '../api/docsApi';

const rootDoc: DocSummary = {
  slug: 'root-doc',
  title: 'Root Doc',
  collectionId: null,
  updatedAt: '2026-03-20T10:00:00.000Z',
};

const collectedDoc: DocSummary = {
  slug: 'collected-doc',
  title: 'Collected Doc',
  collectionId: 'col-1',
  updatedAt: '2026-03-20T10:00:00.000Z',
};

const collection = {
  id: 'col-1',
  userId: 'u1',
  parentId: null,
  name: 'Work',
  position: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const treeWithRootDocs: CollectionTree = {
  rootDocs: [rootDoc],
  rootCollections: [{ collection, children: [], docs: [collectedDoc] }],
};

const treeEmpty: CollectionTree = { rootDocs: [], rootCollections: [] };

const treeNoRootDocs: CollectionTree = {
  rootDocs: [],
  rootCollections: [{ collection, children: [], docs: [] }],
};

function makeProps(overrides: Partial<Parameters<typeof CollectionsSidebar>[0]> = {}) {
  return {
    tree: treeWithRootDocs,
    isOpen: true,
    currentSlug: null as string | null,
    onClose: vi.fn(),
    onCreateCollection: vi.fn().mockResolvedValue(undefined),
    onRenameCollection: vi.fn().mockResolvedValue(undefined),
    onDeleteCollection: vi.fn().mockResolvedValue(undefined),
    onMoveDoc: vi.fn().mockResolvedValue(undefined),
    onNavigateToDoc: vi.fn(),
    onNewDocInCollection: vi.fn(),
    ...overrides,
  };
}

describe('CollectionsSidebar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('VirtualUnsortedNode integration', () => {
    it('renders "Unsorted" when the tree has root docs', () => {
      render(<CollectionsSidebar {...makeProps()} />);
      expect(screen.getByText('Unsorted')).toBeInTheDocument();
    });

    it('does not render "Unsorted" when there are no root docs', () => {
      render(<CollectionsSidebar {...makeProps({ tree: treeNoRootDocs })} />);
      expect(screen.queryByText('Unsorted')).not.toBeInTheDocument();
    });

    it('root docs are accessible inside the VirtualUnsortedNode', () => {
      render(<CollectionsSidebar {...makeProps()} />);
      expect(screen.getByText('Root Doc')).toBeInTheDocument();
    });

    it('real collections render alongside the VirtualUnsortedNode', () => {
      render(<CollectionsSidebar {...makeProps()} />);
      expect(screen.getByText('Unsorted')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state message when tree has no docs or collections', () => {
      render(<CollectionsSidebar {...makeProps({ tree: treeEmpty })} />);
      expect(screen.getByText(/no docs or collections/i)).toBeInTheDocument();
    });

    it('does not show "Unsorted" in the empty state', () => {
      render(<CollectionsSidebar {...makeProps({ tree: treeEmpty })} />);
      expect(screen.queryByText('Unsorted')).not.toBeInTheDocument();
    });
  });

  describe('new doc button', () => {
    it('calls onNewDocInCollection(null) when the footer New doc button is clicked', () => {
      const onNewDocInCollection = vi.fn();
      render(<CollectionsSidebar {...makeProps({ onNewDocInCollection })} />);
      fireEvent.click(screen.getByText(/new doc/i));
      expect(onNewDocInCollection).toHaveBeenCalledWith(null);
    });
  });

  describe('close button', () => {
    it('calls onClose when the close button is clicked', () => {
      const onClose = vi.fn();
      render(<CollectionsSidebar {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByLabelText(/close sidebar/i));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('visibility', () => {
    it('applies translate-x-0 class when isOpen is true', () => {
      render(<CollectionsSidebar {...makeProps({ isOpen: true })} />);
      expect(screen.getByRole('complementary').className).toContain('translate-x-0');
    });

    it('applies -translate-x-full class when isOpen is false', () => {
      render(<CollectionsSidebar {...makeProps({ isOpen: false })} />);
      expect(screen.getByRole('complementary').className).toContain('-translate-x-full');
    });
  });

  describe('auto-expand unsorted on currentSlug', () => {
    it('navigates to a root doc via VirtualUnsortedNode', () => {
      const onNavigateToDoc = vi.fn();
      render(<CollectionsSidebar {...makeProps({ onNavigateToDoc, currentSlug: 'root-doc' })} />);
      fireEvent.click(screen.getByRole('button', { name: /root doc/i }));
      expect(onNavigateToDoc).toHaveBeenCalledWith('root-doc');
    });
  });
});
