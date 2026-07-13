export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // Service role key bypasses RLS — used only for trusted server-side reads/writes.
  // Never expose this to the client.
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export type RepositoryErrorKind = 'not_found' | 'conflict' | 'rls_denied' | 'network';

export class RepositoryError extends Error {
  readonly kind: RepositoryErrorKind;
  readonly status: number;

  constructor(message: string, kind: RepositoryErrorKind, status: number) {
    super(message);
    this.name = 'RepositoryError';
    this.kind = kind;
    this.status = status;
  }
}

function classifyStatus(status: number, postgresCode: string | undefined): RepositoryErrorKind {
  if (status === 404) return 'not_found';
  if (status === 409 || postgresCode?.startsWith('23')) return 'conflict';
  if (status === 401 || status === 403) return 'rls_denied';
  return 'network';
}

async function classifyError(res: Response): Promise<RepositoryError> {
  const text = await res.text();
  let postgresCode: string | undefined;
  try {
    postgresCode = (JSON.parse(text) as { code?: string }).code;
  } catch {
    // Response body wasn't JSON — fall through with no code.
  }

  return new RepositoryError(`request failed: ${res.status} ${text}`, classifyStatus(res.status, postgresCode), res.status);
}

function isSyntheticJwt(jwt: string): boolean {
  return jwt.startsWith('synthetic.') && jwt.endsWith('.internal');
}

export type AuthMode =
  | { type: 'anon' }
  | { type: 'service-role' }
  // Synthetic JWTs (minted for API-key/MCP auth) aren't signed with the Supabase
  // secret and fail PostgREST's cryptographic verification — substitute the
  // service-role key. Ownership is enforced at the Worker layer before this call.
  | { type: 'caller'; jwt: string };

// Most writes are made on behalf of the caller when a JWT is present, falling
// back to the anon key for unauthenticated writes RLS permits (e.g. anonymous
// comments, unowned-doc claims).
export function callerAuth(jwt: string | undefined): AuthMode {
  return jwt ? { type: 'caller', jwt } : { type: 'anon' };
}

function authToken(env: SupabaseEnv, auth: AuthMode): string {
  switch (auth.type) {
    case 'anon':
      return env.SUPABASE_ANON_KEY;
    case 'service-role':
      return env.SUPABASE_SERVICE_ROLE_KEY;
    case 'caller':
      return isSyntheticJwt(auth.jwt) ? env.SUPABASE_SERVICE_ROLE_KEY : auth.jwt;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth: AuthMode;
  representation?: boolean;
  countExact?: boolean;
}

function preferHeader(options: RequestOptions): string | undefined {
  const prefs: string[] = [];
  if (options.representation) prefs.push('return=representation');
  if (options.countExact) prefs.push('count=exact');
  return prefs.length ? prefs.join(',') : undefined;
}

// Every PostgREST call in the repository routes through here — one place that
// builds headers, selects the auth mode, and classifies failures.
export async function request(env: SupabaseEnv, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${authToken(env, options.auth)}`,
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const prefer = preferHeader(options);
  if (prefer) headers.Prefer = prefer;

  let res: Response;
  try {
    res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new RepositoryError(`network request failed: ${err instanceof Error ? err.message : String(err)}`, 'network', 0);
  }

  if (!res.ok) throw await classifyError(res);
  return res;
}

export async function requestJson<T>(env: SupabaseEnv, path: string, options: RequestOptions): Promise<T> {
  const res = await request(env, path, options);
  return res.json() as Promise<T>;
}

export function eq(column: string, value: string): string {
  return `${column}=eq.${encodeURIComponent(value)}`;
}

export function restPath(table: string, ...params: string[]): string {
  return params.length ? `${table}?${params.join('&')}` : table;
}
