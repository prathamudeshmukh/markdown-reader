import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OpenMarkClient } from './openmarkClient.js';

const createDocSchema = z.object({
  content: z.string().min(1, 'content is required'),
  title: z.string().max(300).optional(),
});

const readDocSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
});

const updateDocSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
  content: z.string().min(1, 'content is required'),
  title: z.string().max(300).optional(),
});

export interface ToolHandlers {
  openmark_create_doc: (args: Record<string, unknown>) => Promise<string>;
  openmark_read_doc: (args: Record<string, unknown>) => Promise<string>;
  openmark_update_doc: (args: Record<string, unknown>) => Promise<string>;
}

export function buildToolHandlers(client: OpenMarkClient): ToolHandlers {
  async function openmark_create_doc(args: Record<string, unknown>): Promise<string> {
    const { content, title } = createDocSchema.parse(args);
    const result = await client.createDoc(content, title);
    return `Created: ${result.url}`;
  }

  async function openmark_read_doc(args: Record<string, unknown>): Promise<string> {
    const { slug } = readDocSchema.parse(args);
    const doc = await client.readDoc(slug);
    return [
      doc.title ? `Title: ${doc.title}` : 'Title: (untitled)',
      `URL: ${doc.url}`,
      '',
      doc.content,
    ].join('\n');
  }

  async function openmark_update_doc(args: Record<string, unknown>): Promise<string> {
    const { slug, content, title } = updateDocSchema.parse(args);
    const result = await client.updateDoc(slug, content, title);
    return `Updated: ${result.url}`;
  }

  return { openmark_create_doc, openmark_read_doc, openmark_update_doc };
}

export function registerTools(server: McpServer, client: OpenMarkClient): void {
  const handlers = buildToolHandlers(client);

  server.tool(
    'openmark_create_doc',
    'Create a new markdown document in openmark and return its shareable URL.',
    { content: z.string().describe('Markdown content (max 500 KB)'), title: z.string().max(300).optional().describe('Optional document title') },
    async ({ content, title }) => ({
      content: [{ type: 'text' as const, text: await handlers.openmark_create_doc({ content, title }) }],
    }),
  );

  server.tool(
    'openmark_read_doc',
    'Read a document\'s content from openmark by slug or URL.',
    { slug: z.string().describe('The 7-char slug or full openmark URL') },
    async ({ slug }) => ({
      content: [{ type: 'text' as const, text: await handlers.openmark_read_doc({ slug }) }],
    }),
  );

  server.tool(
    'openmark_update_doc',
    'Replace the content of an existing openmark document you own.',
    { slug: z.string().describe('The 7-char slug or full openmark URL'), content: z.string().describe('New markdown content'), title: z.string().max(300).optional().describe('New title (omit to leave unchanged)') },
    async ({ slug, content, title }) => ({
      content: [{ type: 'text' as const, text: await handlers.openmark_update_doc({ slug, content, title }) }],
    }),
  );
}
