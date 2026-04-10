import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionNode, { type CollectionNodeActions } from './CollectionNode';
import type { CollectionNode as CollectionNodeType, CollectionTree } from '../types/collections';
import type { DocSummary } from '../api/docsApi';

const collection = {
  id: 'col-1',
  userId: 'u1',
  parentId: null,
  name: 'Projects',
  position: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const doc: DocSummary = {
  slug: 'my-doc',
  title: 'My Doc',
  collectionId: 'col-1',
  updatedAt: '2026-03-20T10:00:00.000Z',
};

const emptyTree: CollectionTree = { rootDocs: [], rootCollections: [] };

function makeNode(overrides: Partial<CollectionNodeType> = {}): CollectionNodeType {
  return { collection, children: [], docs: [doc], ...overrides };
}

function makeActions(overrides: Partial<CollectionNodeActions> = {}): CollectionNodeActions {
  return {
    onToggle: vi.fn(),
    onRename: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onNewDoc: vi.fn(),
    onNewSubCollection: vi.fn(),
    onNavigateToDoc: vi.fn(),
    onMoveDoc: vi.fn(),
    ...overrides,
  };
}

function makeProps(
  actionOverrides: Partial<CollectionNodeActions> = {},
  propOverrides: Record<string, unknown> = {},
) {
  return {
    node: makeNode(),
    depth: 0,
    isExpanded: true,
    currentSlug: null as string | null,
    tree: emptyTree,
    actions: makeActions(actionOverrides),
    ...propOverrides,
  };
}

describe('CollectionNode', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('rendering', () => {
    it('renders the collection name', () => {
      render(<CollectionNode {...makeProps()} />);
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('shows doc count badge when the collection has docs', () => {
      render(<CollectionNode {...makeProps()} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('does not show a count badge for an empty collection', () => {
      render(<CollectionNode {...makeProps({}, { node: makeNode({ docs: [] }) })} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('sums nested docs in the count badge', () => {
      const childCollection = { ...collection, id: 'col-2', parentId: 'col-1', name: 'Sub' };
      const childNode: CollectionNodeType = {
        collection: childCollection,
        children: [],
        docs: [{ ...doc, slug: 'child-doc', collectionId: 'col-2' }],
      };
      const parent = makeNode({ docs: [], children: [childNode] });
      render(<CollectionNode {...makeProps({}, { node: parent })} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders docs when isExpanded is true', () => {
      render(<CollectionNode {...makeProps({}, { isExpanded: true })} />);
      expect(screen.getByText('My Doc')).toBeInTheDocument();
    });
  });

  describe('toggle', () => {
    it('calls actions.onToggle when collection name button is clicked', () => {
      const onToggle = vi.fn();
      render(<CollectionNode {...makeProps({ onToggle })} />);
      fireEvent.click(screen.getByText('Projects'));
      expect(onToggle).toHaveBeenCalledOnce();
    });

    it('calls actions.onToggle when the chevron button is clicked', () => {
      const onToggle = vi.fn();
      render(<CollectionNode {...makeProps({ onToggle })} />);
      fireEvent.click(screen.getByLabelText(/collapse/i));
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });

  describe('delete confirmation flow', () => {
    it('shows delete confirmation after selecting delete from context menu', async () => {
      render(<CollectionNode {...makeProps()} />);
      fireEvent.click(screen.getByLabelText(/collection options/i));
      fireEvent.click(screen.getByText(/delete "projects"/i));
      expect(await screen.findByText(/its docs will move to root/i)).toBeInTheDocument();
    });

    it('calls actions.onDelete with the collection id when confirmed', async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<CollectionNode {...makeProps({ onDelete })} />);
      fireEvent.click(screen.getByLabelText(/collection options/i));
      fireEvent.click(screen.getByText(/delete "projects"/i));
      fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
      expect(onDelete).toHaveBeenCalledWith('col-1');
    });

    it('dismisses the confirmation without deleting on cancel', async () => {
      const onDelete = vi.fn();
      render(<CollectionNode {...makeProps({ onDelete })} />);
      fireEvent.click(screen.getByLabelText(/collection options/i));
      fireEvent.click(screen.getByText(/delete "projects"/i));
      await screen.findByText(/its docs will move to root/i);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByText(/its docs will move to root/i)).not.toBeInTheDocument();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('children slot', () => {
    it('renders children inside the expanded area', () => {
      render(
        <CollectionNode {...makeProps()}>
          <div>Child Content</div>
        </CollectionNode>,
      );
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
  });
});
