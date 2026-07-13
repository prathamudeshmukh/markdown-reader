import { extractUserIdFromJwt } from '../workerUtils';
import { request, requestJson, restPath, eq, callerAuth, type SupabaseEnv } from './shared';

export interface Doc {
  slug: string;
  content: string;
  title: string | null;
  userId: string | null;
  collectionId: string | null;
  creatorToken: string | null;
  editAccess: boolean;
}

export interface DocSummary {
  slug: string;
  title: string | null;
  updatedAt: string;
  collectionId: string | null;
}

interface DocRow {
  slug: string;
  content: string;
  title: string | null;
  user_id: string | null;
  collection_id: string | null;
  creator_token: string | null;
  edit_access: boolean;
}

function rowToDoc(row: DocRow): Doc {
  return {
    slug: row.slug,
    content: row.content,
    title: row.title,
    userId: row.user_id,
    collectionId: row.collection_id,
    creatorToken: row.creator_token,
    editAccess: row.edit_access,
  };
}

const DOC_SELECT = 'select=slug,content,title,user_id,collection_id,creator_token,edit_access';

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

  const rows = await requestJson<DocRow[]>(env, 'docs', {
    method: 'POST',
    body,
    auth: callerAuth(userJwt),
    representation: true,
  });

  return rowToDoc(rows[0]);
}

// getDoc uses the service role key to bypass RLS so any doc can be fetched by slug.
// The slug is the capability token for sharing; access control for enumeration is
// enforced by the restrictive RLS policies that apply to direct REST API callers.
export async function getDoc(env: SupabaseEnv, slug: string): Promise<Doc | null> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.split('.').length !== 3) {
    throw new Error('getDoc failed: SUPABASE_SERVICE_ROLE_KEY is missing or not a valid JWT');
  }

  const rows = await requestJson<DocRow[]>(env, restPath('docs', eq('slug', slug), DOC_SELECT), {
    auth: { type: 'service-role' },
  });

  return rows[0] ? rowToDoc(rows[0]) : null;
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

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (content !== undefined) body.content = content;
  if (title !== undefined) body.title = title;
  if (collectionId !== undefined) body.collection_id = collectionId;
  if (userId !== undefined) body.user_id = userId;
  if (clearCreatorToken) body.creator_token = null;
  if (editAccess !== undefined) body.edit_access = editAccess;

  const rows = await requestJson<DocRow[]>(env, restPath('docs', eq('slug', slug)), {
    method: 'PATCH',
    body,
    auth: callerAuth(userJwt),
    representation: true,
  });

  return rowToDoc(rows[0]);
}

export async function getUserDocs(env: SupabaseEnv, userId: string, userJwt: string): Promise<DocSummary[]> {
  const path = restPath('docs', eq('user_id', userId), 'select=slug,title,updated_at,collection_id', 'order=updated_at.desc');
  const rows = await requestJson<Array<{ slug: string; title: string | null; updated_at: string; collection_id: string | null }>>(
    env,
    path,
    { auth: callerAuth(userJwt) },
  );

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
    collectionId: row.collection_id,
  }));
}

export async function deleteDoc(env: SupabaseEnv, slug: string, userJwt: string): Promise<void> {
  await request(env, restPath('docs', eq('slug', slug)), { method: 'DELETE', auth: callerAuth(userJwt) });
}
