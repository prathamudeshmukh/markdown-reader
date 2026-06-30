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
  edit_access: boolean;
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

function isSyntheticJwt(jwt: string): boolean {
  return jwt.startsWith('synthetic.') && jwt.endsWith('.internal');
}

function buildHeaders(env: SupabaseEnv, userJwt?: string): Record<string, string> {
  // Synthetic JWTs (created for API key auth) are not signed with the Supabase secret
  // and will fail PostgREST's cryptographic verification. Use the service role key
  // instead — ownership is enforced at the Worker layer before this call.
  const token =
    userJwt !== undefined && isSyntheticJwt(userJwt)
      ? env.SUPABASE_SERVICE_ROLE_KEY
      : (userJwt ?? env.SUPABASE_ANON_KEY);
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

  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}&select=slug,content,title,user_id,collection_id,creator_token,edit_access`;
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
  editAccess?: boolean;
}

export async function updateDoc(env: SupabaseEnv, slug: string, fields: UpdateDocFields): Promise<Doc> {
  const { content, title, userJwt, collectionId, userId, clearCreatorToken, editAccess } = fields;
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}`;

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (content !== undefined) body.content = content;
  if (title !== undefined) body.title = title;
  if (collectionId !== undefined) body.collection_id = collectionId;
  if (userId !== undefined) body.user_id = userId;
  if (clearCreatorToken) body.creator_token = null;
  if (editAccess !== undefined) body.edit_access = editAccess;

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

export async function deleteDoc(env: SupabaseEnv, slug: string, userJwt: string): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteDoc failed: ${res.status} ${text}`);
  }
}

export interface CommentRow {
  id: string;
  doc_slug: string;
  user_id: string | null;
  author_name: string;
  content: string;
  anchor_text: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export async function getComments(env: SupabaseEnv, docSlug: string): Promise<CommentRow[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/comments?doc_slug=eq.${encodeURIComponent(docSlug)}&order=created_at.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getComments failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<CommentRow[]>;
}

interface CreateCommentFields {
  docSlug: string;
  userId: string | null;
  authorName: string;
  content: string;
  anchorText: string | null;
}

export async function createComment(env: SupabaseEnv, fields: CreateCommentFields): Promise<CommentRow> {
  const body: Record<string, unknown> = {
    doc_slug: fields.docSlug,
    author_name: fields.authorName,
    content: fields.content,
  };
  if (fields.userId !== null) body.user_id = fields.userId;
  if (fields.anchorText !== null) body.anchor_text = fields.anchorText;

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/comments`, {
    method: 'POST',
    headers: buildHeaders(env),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createComment failed: ${res.status} ${text}`);
  }

  const rows: CommentRow[] = await res.json();
  return rows[0];
}

export async function resolveComment(env: SupabaseEnv, id: string, resolved: boolean): Promise<CommentRow> {
  const url = `${env.SUPABASE_URL}/rest/v1/comments?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(env),
    body: JSON.stringify({ resolved, updated_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resolveComment failed: ${res.status} ${text}`);
  }

  const rows: CommentRow[] = await res.json();
  return rows[0];
}

export async function deleteComment(env: SupabaseEnv, id: string, userJwt: string): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/comments?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteComment failed: ${res.status} ${text}`);
  }
}

export interface ApiKeyRow {
  id: string;
  userId: string;
}

export async function lookupApiKey(env: SupabaseEnv, keyHash: string): Promise<ApiKeyRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/api_keys?key_hash=eq.${encodeURIComponent(keyHash)}&select=id,user_id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`lookupApiKey failed: ${res.status} ${text}`);
  }

  const rows: Array<{ id: string; user_id: string }> = await res.json();
  if (rows.length === 0) return null;
  return { id: rows[0].id, userId: rows[0].user_id };
}

export async function touchApiKeyLastUsed(env: SupabaseEnv, keyId: string): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/api_keys?id=eq.${encodeURIComponent(keyId)}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ last_used_at: new Date().toISOString() }),
  });
}

export interface InsertApiKeyFields {
  userId: string;
  keyHash: string;
  label: string;
}

export interface ApiKeyRecord {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

export async function insertApiKey(env: SupabaseEnv, fields: InsertApiKeyFields, userJwt: string): Promise<ApiKeyRecord> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/api_keys`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ user_id: fields.userId, key_hash: fields.keyHash, label: fields.label }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`insertApiKey failed: ${res.status} ${text}`);
  }

  const rows: ApiKeyRecord[] = await res.json();
  return rows[0];
}

export async function listApiKeys(env: SupabaseEnv, userId: string, userJwt: string): Promise<ApiKeyRecord[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/api_keys?user_id=eq.${encodeURIComponent(userId)}&select=id,label,created_at,last_used_at&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`listApiKeys failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<ApiKeyRecord[]>;
}

export async function deleteApiKey(env: SupabaseEnv, keyId: string, userId: string, userJwt: string): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/api_keys?id=eq.${encodeURIComponent(keyId)}&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteApiKey failed: ${res.status} ${text}`);
  }
}

export async function countComments(env: SupabaseEnv, docSlug: string): Promise<number> {
  const url = `${env.SUPABASE_URL}/rest/v1/comments?doc_slug=eq.${encodeURIComponent(docSlug)}&select=id`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'count=exact',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`countComments failed: ${res.status} ${text}`);
  }

  const contentRange = res.headers.get('Content-Range');
  if (contentRange) {
    const match = /\/(\d+)$/.exec(contentRange);
    if (match) return parseInt(match[1], 10);
  }

  const rows: unknown[] = await res.json();
  return rows.length;
}
