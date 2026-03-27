import { describe, it, expect } from 'vitest';
import { buildTree, findDocCollectionId, flattenTree } from './collectionTree';
import type { Collection } from '../types/collections';
import type { DocSummary } from '../api/docsApi';

function makeCol(overrides: Partial<Collection> & { id: string; name: string }): Collection {
  return {
    userId: 'user1',
    parentId: null,
    position: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDoc(slug: string, collectionId: string | null = null): DocSummary {
  return { slug, title: null, updatedAt: '2024-01-01T00:00:00Z', collectionId };
}

describe('buildTree', () => {
  it('returns empty tree when given empty arrays', () => {
    const tree = buildTree([], []);
    expect(tree.rootDocs).toEqual([]);
    expect(tree.rootCollections).toEqual([]);
  });

  it('places docs with null collectionId in rootDocs', () => {
    const docs = [makeDoc('abc', null), makeDoc('def', null)];
    const tree = buildTree([], docs);
    expect(tree.rootDocs).toHaveLength(2);
    expect(tree.rootCollections).toHaveLength(0);
  });

  it('places root collections at top level', () => {
    const cols = [makeCol({ id: 'c1', name: 'Work' }), makeCol({ id: 'c2', name: 'Personal' })];
    const tree = buildTree(cols, []);
    expect(tree.rootCollections).toHaveLength(2);
    expect(tree.rootCollections[0].collection.name).toBe('Work');
  });

  it('nests sub-collections under their parent', () => {
    const cols = [
      makeCol({ id: 'c1', name: 'Work' }),
      makeCol({ id: 'c2', name: 'Projects', parentId: 'c1' }),
    ];
    const tree = buildTree(cols, []);
    expect(tree.rootCollections).toHaveLength(1);
    expect(tree.rootCollections[0].children).toHaveLength(1);
    expect(tree.rootCollections[0].children[0].collection.name).toBe('Projects');
  });

  it('places docs in their collection node', () => {
    const cols = [makeCol({ id: 'c1', name: 'Work' })];
    const docs = [makeDoc('abc', 'c1'), makeDoc('root', null)];
    const tree = buildTree(cols, docs);
    expect(tree.rootDocs).toHaveLength(1);
    expect(tree.rootCollections[0].docs).toHaveLength(1);
    expect(tree.rootCollections[0].docs[0].slug).toBe('abc');
  });

  it('handles deeply nested collections', () => {
    const cols = [
      makeCol({ id: 'a', name: 'A' }),
      makeCol({ id: 'b', name: 'B', parentId: 'a' }),
      makeCol({ id: 'c', name: 'C', parentId: 'b' }),
    ];
    const tree = buildTree(cols, []);
    const depth2 = tree.rootCollections[0].children[0].children[0];
    expect(depth2.collection.name).toBe('C');
  });

  it('orphans docs whose collectionId references no collection', () => {
    // Docs referencing unknown collection_id should just not appear in any node
    // (they would appear in docsByCollection map with that key but no node to pick them up)
    const docs = [makeDoc('orphan', 'nonexistent')];
    const tree = buildTree([], docs);
    expect(tree.rootDocs).toHaveLength(0);
    expect(tree.rootCollections).toHaveLength(0);
  });
});

describe('findDocCollectionId', () => {
  it('returns null when doc is in root', () => {
    const tree = buildTree([], [makeDoc('abc', null)]);
    expect(findDocCollectionId(tree, 'abc')).toBeNull();
  });

  it('returns collection id when doc is in a collection', () => {
    const cols = [makeCol({ id: 'c1', name: 'Work' })];
    const docs = [makeDoc('abc', 'c1')];
    const tree = buildTree(cols, docs);
    expect(findDocCollectionId(tree, 'abc')).toBe('c1');
  });

  it('returns null when doc does not exist', () => {
    const tree = buildTree([], []);
    expect(findDocCollectionId(tree, 'missing')).toBeNull();
  });
});

describe('flattenTree', () => {
  it('returns empty array for empty tree', () => {
    const tree = buildTree([], []);
    expect(flattenTree(tree)).toEqual([]);
  });

  it('returns root collections with depth 0', () => {
    const cols = [makeCol({ id: 'c1', name: 'Work' }), makeCol({ id: 'c2', name: 'Personal' })];
    const tree = buildTree(cols, []);
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(2);
    expect(flat[0].depth).toBe(0);
  });

  it('returns nested collections with correct depth', () => {
    const cols = [
      makeCol({ id: 'c1', name: 'Work' }),
      makeCol({ id: 'c2', name: 'Projects', parentId: 'c1' }),
    ];
    const tree = buildTree(cols, []);
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(2);
    expect(flat[1].depth).toBe(1);
    expect(flat[1].collection.name).toBe('Projects');
  });
});
