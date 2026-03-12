export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export interface Doc {
  slug: string;
  content: string;
}

function authHeaders(env: SupabaseEnv): Record<string, string> {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export async function createDoc(env: SupabaseEnv, slug: string, content: string): Promise<Doc> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/docs`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({ slug, content }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createDoc failed: ${res.status} ${text}`);
  }

  const rows: Doc[] = await res.json();
  return rows[0];
}

export async function getDoc(env: SupabaseEnv, slug: string): Promise<Doc | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}&select=slug,content`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getDoc failed: ${res.status} ${text}`);
  }

  const rows: Doc[] = await res.json();
  return rows[0] ?? null;
}

export async function updateDoc(env: SupabaseEnv, slug: string, content: string): Promise<Doc> {
  const url = `${env.SUPABASE_URL}/rest/v1/docs?slug=eq.${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(env),
    body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateDoc failed: ${res.status} ${text}`);
  }

  const rows: Doc[] = await res.json();
  return rows[0];
}
