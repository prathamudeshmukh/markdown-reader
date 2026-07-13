import { request, requestJson, restPath, eq, callerAuth, type SupabaseEnv } from './shared';

export interface ApiKeyRow {
  id: string;
  userId: string;
}

export interface ApiKeyRecord {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKeyRecordRow {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

function rowToApiKeyRecord(row: ApiKeyRecordRow): ApiKeyRecord {
  return { id: row.id, label: row.label, createdAt: row.created_at, lastUsedAt: row.last_used_at };
}

export async function lookupApiKey(env: SupabaseEnv, keyHash: string): Promise<ApiKeyRow | null> {
  const path = restPath('api_keys', eq('key_hash', keyHash), 'select=id,user_id', 'limit=1');
  const rows = await requestJson<Array<{ id: string; user_id: string }>>(env, path, { auth: { type: 'service-role' } });
  if (rows.length === 0) return null;
  return { id: rows[0].id, userId: rows[0].user_id };
}

export async function touchApiKeyLastUsed(env: SupabaseEnv, keyId: string): Promise<void> {
  await request(env, restPath('api_keys', eq('id', keyId)), {
    method: 'PATCH',
    body: { last_used_at: new Date().toISOString() },
    auth: { type: 'service-role' },
  });
}

export interface InsertApiKeyFields {
  userId: string;
  keyHash: string;
  label: string;
}

export async function insertApiKey(env: SupabaseEnv, fields: InsertApiKeyFields, userJwt: string): Promise<ApiKeyRecord> {
  const rows = await requestJson<ApiKeyRecordRow[]>(env, 'api_keys', {
    method: 'POST',
    body: { user_id: fields.userId, key_hash: fields.keyHash, label: fields.label },
    auth: callerAuth(userJwt),
    representation: true,
  });

  return rowToApiKeyRecord(rows[0]);
}

export async function listApiKeys(env: SupabaseEnv, userId: string, userJwt: string): Promise<ApiKeyRecord[]> {
  const path = restPath('api_keys', eq('user_id', userId), 'select=id,label,created_at,last_used_at', 'order=created_at.desc');
  const rows = await requestJson<ApiKeyRecordRow[]>(env, path, { auth: callerAuth(userJwt) });
  return rows.map(rowToApiKeyRecord);
}

export async function deleteApiKey(env: SupabaseEnv, keyId: string, userId: string, userJwt: string): Promise<void> {
  const path = restPath('api_keys', eq('id', keyId), eq('user_id', userId));
  await request(env, path, { method: 'DELETE', auth: callerAuth(userJwt) });
}
