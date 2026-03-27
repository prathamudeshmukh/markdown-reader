import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchCollections,
  createCollection as apiCreateCollection,
  updateCollection as apiUpdateCollection,
  deleteCollection as apiDeleteCollection,
} from '../api/collectionsApi';
import { fetchUserDocs } from '../api/docsApi';
import { buildTree } from '../utils/collectionTree';
import type { Collection, CollectionTree, CreateCollectionInput, UpdateCollectionInput } from '../types/collections';
import type { DocSummary } from '../api/docsApi';

export type CollectionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; tree: CollectionTree }
  | { status: 'error'; message: string };

function mapCollection(raw: Record<string, unknown>): Collection {
  return {
    id: raw.id as string,
    userId: (raw.userId ?? raw.user_id) as string,
    parentId: (raw.parentId ?? raw.parent_id ?? null) as string | null,
    name: raw.name as string,
    position: raw.position as number,
    createdAt: (raw.createdAt ?? raw.created_at) as string,
    updatedAt: (raw.updatedAt ?? raw.updated_at) as string,
  };
}

export function useCollections(): {
  state: CollectionsState;
  createCollection: (input: CreateCollectionInput) => Promise<void>;
  renameCollection: (id: string, name: string) => Promise<void>;
  moveCollection: (id: string, parentId: string | null) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  moveDocToCollection: (slug: string, collectionId: string | null) => Promise<void>;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [state, setState] = useState<CollectionsState>({ status: 'idle' });
  const collectionsRef = useRef<Collection[]>([]);
  const docsRef = useRef<DocSummary[]>([]);

  const load = useCallback(() => {
    if (!user) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    Promise.all([fetchCollections(), fetchUserDocs()])
      .then(([rawCollections, docs]) => {
        const collections = rawCollections.map((c) => mapCollection(c as unknown as Record<string, unknown>));
        collectionsRef.current = collections;
        docsRef.current = docs;
        setState({ status: 'ready', tree: buildTree(collections, docs) });
      })
      .catch((err: Error) => setState({ status: 'error', message: err.message }));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createCollection = useCallback(async (input: CreateCollectionInput) => {
    const raw = await apiCreateCollection(input);
    const newCol = mapCollection(raw as unknown as Record<string, unknown>);
    const updated = [...collectionsRef.current, newCol];
    collectionsRef.current = updated;
    setState({ status: 'ready', tree: buildTree(updated, docsRef.current) });
  }, []);

  const renameCollection = useCallback(async (id: string, name: string) => {
    const prevCollections = collectionsRef.current;
    const prevState = state;

    const optimistic = prevCollections.map((c) =>
      c.id === id ? { ...c, name } : c,
    );
    collectionsRef.current = optimistic;
    setState({ status: 'ready', tree: buildTree(optimistic, docsRef.current) });

    try {
      await apiUpdateCollection(id, { name } as UpdateCollectionInput);
    } catch (err) {
      collectionsRef.current = prevCollections;
      setState(prevState);
      throw err;
    }
  }, [state]);

  const moveCollection = useCallback(async (id: string, parentId: string | null) => {
    const prevCollections = collectionsRef.current;
    const prevState = state;

    const optimistic = prevCollections.map((c) =>
      c.id === id ? { ...c, parentId } : c,
    );
    collectionsRef.current = optimistic;
    setState({ status: 'ready', tree: buildTree(optimistic, docsRef.current) });

    try {
      await apiUpdateCollection(id, { parentId } as UpdateCollectionInput);
    } catch (err) {
      collectionsRef.current = prevCollections;
      setState(prevState);
      throw err;
    }
  }, [state]);

  const deleteCollection = useCallback(async (id: string) => {
    const prevCollections = collectionsRef.current;
    const prevDocs = docsRef.current;
    const prevState = state;

    // Collect all IDs to remove (the collection and its descendants)
    const toRemove = new Set<string>();
    function collectDescendants(targetId: string): void {
      toRemove.add(targetId);
      for (const c of prevCollections) {
        if (c.parentId === targetId) collectDescendants(c.id);
      }
    }
    collectDescendants(id);

    const optimisticCollections = prevCollections.filter((c) => !toRemove.has(c.id));
    const optimisticDocs = prevDocs.map((d) =>
      d.collectionId && toRemove.has(d.collectionId) ? { ...d, collectionId: null } : d,
    );
    collectionsRef.current = optimisticCollections;
    docsRef.current = optimisticDocs;
    setState({ status: 'ready', tree: buildTree(optimisticCollections, optimisticDocs) });

    try {
      await apiDeleteCollection(id);
    } catch (err) {
      collectionsRef.current = prevCollections;
      docsRef.current = prevDocs;
      setState(prevState);
      throw err;
    }
  }, [state]);

  const moveDocToCollection = useCallback(async (slug: string, collectionId: string | null) => {
    const prevDocs = docsRef.current;
    const prevState = state;

    const optimistic = prevDocs.map((d) =>
      d.slug === slug ? { ...d, collectionId } : d,
    );
    docsRef.current = optimistic;
    setState({ status: 'ready', tree: buildTree(collectionsRef.current, optimistic) });

    try {
      const { updateDoc } = await import('../api/docsApi');
      await updateDoc(slug, { collectionId });
    } catch (err) {
      docsRef.current = prevDocs;
      setState(prevState);
      throw err;
    }
  }, [state]);

  return {
    state,
    createCollection,
    renameCollection,
    moveCollection,
    deleteCollection,
    moveDocToCollection,
    refresh: load,
  };
}
