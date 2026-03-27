import type { DocSummary } from '../api/docsApi';

export interface Collection {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionNode {
  collection: Collection;
  children: CollectionNode[];
  docs: DocSummary[];
}

export interface CollectionTree {
  rootDocs: DocSummary[];
  rootCollections: CollectionNode[];
}

export interface CreateCollectionInput {
  name: string;
  parentId?: string | null;
}

export interface UpdateCollectionInput {
  name?: string;
  parentId?: string | null;
  position?: number;
}

export const EMPTY_TREE: CollectionTree = {
  rootDocs: [],
  rootCollections: [],
};
