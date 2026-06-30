import { nanoid } from 'nanoid';
import { createDoc, getDoc, updateDoc, type SupabaseEnv } from './supabaseClient';
import { resolveApiKey } from './apiKeyAuth';

export type RouterEnv = SupabaseEnv;

const MCP_PATH = '/mcp';
const BASE_URL = 'https://openmark.cc';
const MAX_CONTENT_BYTES = 500_000;
const MAX_TITLE_CHARS = 300;
const SLUG_LENGTH = 7;

// --- JSON-RPC helpers ---

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string };
}

function rpcOk(id: string | number | null, result: unknown): Response {
  const body: JsonRpcSuccess = { jsonrpc: '2.0', id, result };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function rpcError(id: string | number | null, code: number, message: string): Response {
  const body: JsonRpcError = { jsonrpc: '2.0', id, error: { code, message } };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-OpenMark-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function textResult(text: string): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text }] };
}

function docUrl(slug: string): string {
  return `${BASE_URL}/d/${slug}`;
}

// --- Slug extraction ---

function extractSlug(input: string): string {
  try {
    const url = new URL(input);
    const parts = url.pathname.split('/');
    return parts[parts.length - 1] || input;
  } catch {
    return input;
  }
}

// --- Tool definitions ---

const TOOL_DEFINITIONS = [
  {
    name: 'openmark_create_doc',
    description: 'Create a new markdown document in openmark and return its shareable URL.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content (max 500 KB)' },
        title: { type: 'string', description: 'Optional document title (max 300 chars)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'openmark_read_doc',
    description: 'Read a document\'s content from openmark by slug or URL.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The 7-char slug or full openmark URL' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'openmark_update_doc',
    description: 'Replace the content of an existing openmark document you own.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The 7-char slug or full openmark URL' },
        content: { type: 'string', description: 'New markdown content' },
        title: { type: 'string', description: 'New title (omit to leave unchanged)' },
      },
      required: ['slug', 'content'],
    },
  },
];

// --- Tool implementations ---

interface CreateArgs { content?: unknown; title?: unknown }
interface ReadArgs { slug?: unknown }
interface UpdateArgs { slug?: unknown; content?: unknown; title?: unknown }

async function toolCreateDoc(args: unknown, userId: string, env: RouterEnv): Promise<string> {
  const { content, title } = args as CreateArgs;

  if (typeof content !== 'string' || content.length === 0) {
    throw { code: -32602, message: 'content is required and must be a non-empty string' };
  }
  if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
    throw { code: -32602, message: 'Content exceeds 500 KB limit' };
  }
  const parsedTitle = typeof title === 'string' ? title.slice(0, MAX_TITLE_CHARS) : undefined;

  // Minimal synthetic JWT embedding userId so createDoc can set user_id
  const syntheticJwt = `synthetic.${btoa(JSON.stringify({ sub: userId }))}.internal`;

  const slug = nanoid(SLUG_LENGTH);
  const doc = await createDoc(env, slug, { content, title: parsedTitle, userJwt: syntheticJwt });
  return `Created: ${docUrl(doc.slug)}`;
}

async function toolReadDoc(args: unknown, env: RouterEnv): Promise<string> {
  const { slug: rawSlug } = args as ReadArgs;

  if (typeof rawSlug !== 'string' || rawSlug.length === 0) {
    throw { code: -32602, message: 'slug is required' };
  }

  const slug = extractSlug(rawSlug);
  const doc = await getDoc(env, slug);
  if (!doc) throw { code: -32602, message: 'Document not found' };

  const lines = [
    doc.title ? `Title: ${doc.title}` : 'Title: (untitled)',
    `URL: ${docUrl(doc.slug)}`,
    '',
    doc.content,
  ];
  return lines.join('\n');
}

async function toolUpdateDoc(args: unknown, userId: string, env: RouterEnv): Promise<string> {
  const { slug: rawSlug, content, title } = args as UpdateArgs;

  if (typeof rawSlug !== 'string' || rawSlug.length === 0) {
    throw { code: -32602, message: 'slug is required' };
  }
  if (typeof content !== 'string' || content.length === 0) {
    throw { code: -32602, message: 'content is required' };
  }

  const slug = extractSlug(rawSlug);
  const existing = await getDoc(env, slug);
  if (!existing) throw { code: -32602, message: 'Document not found' };
  if (existing.user_id !== null && existing.user_id !== userId) {
    throw { code: -32602, message: 'Forbidden: you do not own this document' };
  }

  const parsedTitle = typeof title === 'string' ? title.slice(0, MAX_TITLE_CHARS) : undefined;
  const syntheticJwt = `synthetic.${btoa(JSON.stringify({ sub: userId }))}.internal`;

  const doc = await updateDoc(env, slug, { content, title: parsedTitle, userJwt: syntheticJwt });
  return `Updated: ${docUrl(doc.slug)}`;
}

// --- Method handlers ---

function handleInitialize(id: string | number | null): Response {
  return rpcOk(id, {
    protocolVersion: '2025-03-26',
    serverInfo: { name: 'openmark', version: '1.0.0' },
    capabilities: { tools: {} },
  });
}

function handleToolsList(id: string | number | null): Response {
  return rpcOk(id, { tools: TOOL_DEFINITIONS });
}

async function handleToolsCall(
  id: string | number | null,
  params: { name?: unknown; arguments?: unknown },
  userId: string,
  env: RouterEnv,
): Promise<Response> {
  const { name, arguments: args } = params;

  if (typeof name !== 'string') {
    return rpcError(id, -32602, 'Tool name is required');
  }

  try {
    let text: string;
    if (name === 'openmark_create_doc') {
      text = await toolCreateDoc(args, userId, env);
    } else if (name === 'openmark_read_doc') {
      text = await toolReadDoc(args, env);
    } else if (name === 'openmark_update_doc') {
      text = await toolUpdateDoc(args, userId, env);
    } else {
      return rpcError(id, -32602, `Unknown tool: ${name}`);
    }
    return rpcOk(id, textResult(text));
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
      const e = err as { code: number; message: string };
      return rpcError(id, e.code, e.message);
    }
    return rpcError(id, -32603, 'Internal error');
  }
}

// --- Main entry ---

interface RpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export async function handleMcpRequest(
  request: Request,
  env: RouterEnv,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== MCP_PATH) return null;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return rpcError(null, -32600, 'Only POST requests are supported');
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }

  if (Array.isArray(parsed)) {
    return rpcError(null, -32600, 'Batch requests are not supported');
  }

  const rpc = parsed as RpcRequest;
  const id = rpc.id ?? null;
  const method = rpc.method ?? '';
  const params = (rpc.params ?? {}) as Record<string, unknown>;

  // initialize is the only method that does not require auth
  if (method === 'initialize') {
    return handleInitialize(id);
  }

  // All other methods require API key auth
  let userId: string;
  try {
    const ctx = await resolveApiKey(request, env as SupabaseEnv);
    if (!ctx) return rpcError(id, -32001, 'Unauthorized: invalid or missing API key');
    userId = ctx.userId;
  } catch {
    return rpcError(id, -32001, 'Unauthorized: invalid or missing API key');
  }

  if (method === 'tools/list') {
    return handleToolsList(id);
  }

  if (method === 'tools/call') {
    return handleToolsCall(
      id,
      params as { name?: unknown; arguments?: unknown },
      userId,
      env,
    );
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}
