import type { Collection } from '../../types/collections';
import { request, requestJson, restPath, eq, callerAuth, type SupabaseEnv } from './shared';

interface CollectionRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCollections(env: SupabaseEnv, userId: string, userJwt: string): Promise<Collection[]> {
  const path = restPath(
    'collections',
    eq('user_id', userId),
    'select=id,user_id,parent_id,name,position,created_at,updated_at',
    'order=position.asc,name.asc',
  );
  const rows = await requestJson<CollectionRow[]>(env, path, { auth: callerAuth(userJwt) });
  return rows.map(rowToCollection);
}

interface CreateCollectionFields {
  name: string;
  parentId?: string | null;
  userId: string;
  userJwt: string;
}

export async function createCollection(env: SupabaseEnv, fields: CreateCollectionFields): Promise<Collection> {
  const { name, parentId, userId, userJwt } = fields;
  const body: Record<string, unknown> = { name, user_id: userId };
  if (parentId !== undefined) body.parent_id = parentId;

  const rows = await requestJson<CollectionRow[]>(env, 'collections', {
    method: 'POST',
    body,
    auth: callerAuth(userJwt),
    representation: true,
  });

  return rowToCollection(rows[0]);
}

interface UpdateCollectionFields {
  name?: string;
  parentId?: string | null;
  position?: number;
  userJwt: string;
}

export async function updateCollection(env: SupabaseEnv, id: string, fields: UpdateCollectionFields): Promise<Collection> {
  const { name, parentId, position, userJwt } = fields;

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) body.name = name;
  if (parentId !== undefined) body.parent_id = parentId;
  if (position !== undefined) body.position = position;

  const rows = await requestJson<CollectionRow[]>(env, restPath('collections', eq('id', id)), {
    method: 'PATCH',
    body,
    auth: callerAuth(userJwt),
    representation: true,
  });

  return rowToCollection(rows[0]);
}

export async function deleteCollection(env: SupabaseEnv, id: string, userJwt: string): Promise<void> {
  await request(env, restPath('collections', eq('id', id)), { method: 'DELETE', auth: callerAuth(userJwt) });
}
