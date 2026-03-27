import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchUserDocs, type DocSummary } from '../api/docsApi';
import { readRecentDocs, type RecentDoc } from '../utils/recentDocs';

export interface DisplayDoc {
  slug: string;
  title: string | null;
  savedAt: string;
  collectionId: string | null;
}

type RecentDocsState =
  | { status: 'loading' }
  | { status: 'ready'; docs: DisplayDoc[] }
  | { status: 'error'; message: string };

export function useRecentDocs(): RecentDocsState {
  const { user } = useAuth();
  const [state, setState] = useState<RecentDocsState>({ status: 'loading' });

  useEffect(() => {
    if (!user) {
      const local = readRecentDocs().map(
        (d: RecentDoc): DisplayDoc => ({
          slug: d.slug,
          title: d.title ?? null,
          savedAt: d.savedAt,
          collectionId: null,
        }),
      );
      setState({ status: 'ready', docs: local });
      return;
    }

    setState({ status: 'loading' });
    fetchUserDocs()
      .then((docs: DocSummary[]) => {
        const display = docs.map(
          (d): DisplayDoc => ({
            slug: d.slug,
            title: d.title,
            savedAt: d.updatedAt,
            collectionId: d.collectionId,
          }),
        );
        setState({ status: 'ready', docs: display });
      })
      .catch((err: Error) => setState({ status: 'error', message: err.message }));
  }, [user]);

  return state;
}
