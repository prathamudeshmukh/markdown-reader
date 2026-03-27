import type { Collection, CollectionNode, CollectionTree } from '../types/collections';
import type { DocSummary } from '../api/docsApi';

export function buildTree(collections: Collection[], docs: DocSummary[]): CollectionTree {
  const byParent = new Map<string | null, Collection[]>();
  for (const col of collections) {
    const siblings = byParent.get(col.parentId) ?? [];
    byParent.set(col.parentId, [...siblings, col]);
  }

  const docsByCollection = new Map<string | null, DocSummary[]>();
  for (const doc of docs) {
    const key = doc.collectionId ?? null;
    const siblings = docsByCollection.get(key) ?? [];
    docsByCollection.set(key, [...siblings, doc]);
  }

  function buildNode(collection: Collection): CollectionNode {
    const children = (byParent.get(collection.id) ?? []).map(buildNode);
    const nodeDocs = docsByCollection.get(collection.id) ?? [];
    return { collection, children, docs: nodeDocs };
  }

  const rootCollections = (byParent.get(null) ?? []).map(buildNode);
  const rootDocs = docsByCollection.get(null) ?? [];

  return { rootDocs, rootCollections };
}

/** Find the collection ID that contains a given doc slug, searching the full tree. */
export function findDocCollectionId(tree: CollectionTree, slug: string): string | null {
  function searchNode(node: CollectionNode): string | null {
    if (node.docs.some((d) => d.slug === slug)) return node.collection.id;
    for (const child of node.children) {
      const found = searchNode(child);
      if (found !== null) return found;
    }
    return null;
  }

  for (const node of tree.rootCollections) {
    const found = searchNode(node);
    if (found !== null) return found;
  }
  return null;
}

/** Collect IDs of all ancestor collections for a given collection ID. */
export function getAncestorIds(collections: Collection[], id: string): string[] {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const ancestors: string[] = [];
  let current = byId.get(id);
  while (current?.parentId) {
    ancestors.push(current.parentId);
    current = byId.get(current.parentId);
  }
  return ancestors;
}

/** Return the N most recently updated docs across all collections, sorted newest first. */
export function getRecentDocs(tree: CollectionTree, limit: number): DocSummary[] {
  const allDocs: DocSummary[] = [];

  function collectDocs(node: CollectionNode): void {
    for (const doc of node.docs) allDocs.push(doc);
    for (const child of node.children) collectDocs(child);
  }

  for (const doc of tree.rootDocs) allDocs.push(doc);
  for (const node of tree.rootCollections) collectDocs(node);

  return [...allDocs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/** Flatten all collections in the tree in depth-first order with their depth level. */
export function flattenTree(tree: CollectionTree): Array<{ collection: Collection; depth: number }> {
  const result: Array<{ collection: Collection; depth: number }> = [];

  function visit(node: CollectionNode, depth: number): void {
    result.push({ collection: node.collection, depth });
    for (const child of node.children) {
      visit(child, depth + 1);
    }
  }

  for (const node of tree.rootCollections) {
    visit(node, 0);
  }
  return result;
}
