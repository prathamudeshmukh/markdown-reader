const STORAGE_KEY = 'mreader:recentDocs';
const MAX_DOCS = 20;

export interface RecentDoc {
  slug: string;
  savedAt: string;
}

function isValidEntry(entry: unknown): entry is RecentDoc {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as Record<string, unknown>).slug === 'string' &&
    typeof (entry as Record<string, unknown>).savedAt === 'string'
  );
}

export function readRecentDocs(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

export function addRecentDoc(slug: string): RecentDoc[] {
  const current = readRecentDocs();
  const newEntry: RecentDoc = { slug, savedAt: new Date().toISOString() };
  const deduplicated = current.filter((doc) => doc.slug !== slug);
  const updated = [newEntry, ...deduplicated].slice(0, MAX_DOCS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
