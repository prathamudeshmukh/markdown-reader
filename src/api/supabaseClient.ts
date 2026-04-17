export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // Service role key bypasses RLS — used only for trusted server-side reads (getDoc).
  // Never expose this to the client.
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface Doc {
  slug: string;
  content: string;
  title: string | null;
  user_id: string | null;
  collection_id: string | null;
  creator_token: string | null;
}

export interface DocSummary {
  slug: string;
  title: string | null;
  updatedAt: string;
  collectionId: string | null;
}

export interface CollectionRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function extractUserIdFromJwt(jwt: string): string | undefined {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1])) as { sub?: string };
    return payload.sub;
  } catch {
    return undefined;
  }
}

function buildHeaders(env: SupabaseEnv, userJwt?: string): Record<string, string> {
  const token = userJwt ?? env.SUPABASE_ANON_KEY;
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

interface CreateDocFields {
  content: string;
  title?: string;
  userJwt?: string;
  collectionId?: string | null;
  creatorToken?: string;
}

export async function createDoc(env: SupabaseEnv, slug: string, fields: CreateDocFields): Promise<Doc> {
  const { content, title, userJwt, collectionId, creatorToken } = fields;
  const userId = userJwt ? extractUserIdFromJwt(userJwt) : undefined;

  const body: Record<string, unknown> = { slug, content };
  if (title !== undefined) body.title = title;
  if (userId !== undefined) body.user_id = userId;
  if (collectionId !== undefined) body.collection_id = collectionId;
  if (creatorToken !== undefined) body.creator_token = creatorToken;

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/docs`, {
    method: 'POST',
    headers: buildHeaders(env, userJwt),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createDoc failed: ${res.status} ${text}`);
  }

  const rows: Doc[] = await res.json();
  return rows[0];
}

// getDoc uses the service role key to bypass RLS so any doc can be fetched by slug.
// The slug is the capability token for sharing; access control for enumeration is
// enforced by the restrictive RLS policies that apply to direct REST API callers.
export async function getDoc(env: SupabaseEnv, slug: string): Promise<Doc | null> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.split('.').length !== 3) {
    throw new Error('getDoc failed: SUPABASE_SERVICE_ROLE_KEY is missing or not a valid JWT');
  }

  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}&select=slug,content,title,user_id,collection_id,creator_token`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getDoc failed: ${res.status} ${text}`);
  }

  const rows: Doc[] = await res.json();
  return rows[0] ?? null;
}

interface UpdateDocFields {
  content?: string;
  title?: string;
  userJwt?: string;
  collectionId?: string | null;
  userId?: string;
  clearCreatorToken?: boolean;
}

export async function updateDoc(env: SupabaseEnv, slug: string, fields: UpdateDocFields): Promise<Doc> {
  const { content, title, userJwt, collectionId, userId, clearCreatorToken } = fields;
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}`;

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (content !== undefined) body.content = content;
  if (title !== undefined) body.title = title;
  if (collectionId !== undefined) body.collection_id = collectionId;
  if (userId !== undefined) body.user_id = userId;
  if (clearCreatorToken) body.creator_token = null;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(env, userJwt),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateDoc failed: ${res.status} ${text}`);
  }

  const rows: Doc[] = await res.json();
  return rows[0];
}

export async function getUserDocs(env: SupabaseEnv, userId: string, userJwt: string): Promise<DocSummary[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/docs?user_id=eq.${encodeURIComponent(userId)}&select=slug,title,updated_at,collection_id&order=updated_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getUserDocs failed: ${res.status} ${text}`);
  }

  const rows: Array<{ slug: string; title: string | null; updated_at: string; collection_id: string | null }> = await res.json();
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
    collectionId: row.collection_id,
  }));
}

export async function getCollections(env: SupabaseEnv, userId: string, userJwt: string): Promise<CollectionRow[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/collections?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,parent_id,name,position,created_at,updated_at&order=position.asc,name.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getCollections failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<CollectionRow[]>;
}

interface CreateCollectionFields {
  name: string;
  parentId?: string | null;
  userId: string;
  userJwt: string;
}

export async function createCollection(env: SupabaseEnv, fields: CreateCollectionFields): Promise<CollectionRow> {
  const { name, parentId, userId, userJwt } = fields;
  const body: Record<string, unknown> = { name, user_id: userId };
  if (parentId !== undefined) body.parent_id = parentId;

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/collections`, {
    method: 'POST',
    headers: buildHeaders(env, userJwt),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createCollection failed: ${res.status} ${text}`);
  }

  const rows: CollectionRow[] = await res.json();
  return rows[0];
}

interface UpdateCollectionFields {
  name?: string;
  parentId?: string | null;
  position?: number;
  userJwt: string;
}

export async function updateCollection(env: SupabaseEnv, id: string, fields: UpdateCollectionFields): Promise<CollectionRow> {
  const { name, parentId, position, userJwt } = fields;
  const url = `${env.SUPABASE_URL}/rest/v1/collections?id=eq.${encodeURIComponent(id)}`;

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) body.name = name;
  if (parentId !== undefined) body.parent_id = parentId;
  if (position !== undefined) body.position = position;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(env, userJwt),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateCollection failed: ${res.status} ${text}`);
  }

  const rows: CollectionRow[] = await res.json();
  return rows[0];
}

export async function deleteCollection(env: SupabaseEnv, id: string, userJwt: string): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/collections?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteCollection failed: ${res.status} ${text}`);
  }
}
