export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export interface Doc {
  slug: string;
  content: string;
  title: string | null;
  user_id: string | null;
}

export interface DocSummary {
  slug: string;
  title: string | null;
  updatedAt: string;
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
}

export async function createDoc(env: SupabaseEnv, slug: string, fields: CreateDocFields): Promise<Doc> {
  const { content, title, userJwt } = fields;
  const userId = userJwt ? extractUserIdFromJwt(userJwt) : undefined;

  const body: Record<string, unknown> = { slug, content };
  if (title !== undefined) body.title = title;
  if (userId !== undefined) body.user_id = userId;

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

export async function getDoc(env: SupabaseEnv, slug: string, userJwt?: string): Promise<Doc | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}&select=slug,content,title,user_id`;
  const token = userJwt ?? env.SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
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
}

export async function updateDoc(env: SupabaseEnv, slug: string, fields: UpdateDocFields): Promise<Doc> {
  const { content, title, userJwt } = fields;
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}`;

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (content !== undefined) body.content = content;
  if (title !== undefined) body.title = title;

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
  const url = `${env.SUPABASE_URL}/rest/v1/docs?user_id=eq.${encodeURIComponent(userId)}&select=slug,title,updated_at&order=updated_at.desc`;
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

  const rows: Array<{ slug: string; title: string | null; updated_at: string }> = await res.json();
  return rows.map((row) => ({ slug: row.slug, title: row.title, updatedAt: row.updated_at }));
}
