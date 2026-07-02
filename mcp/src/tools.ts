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

const listCommentsSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
});

const resolveCommentSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
  commentId: z.string().min(1, 'commentId is required'),
  resolved: z.boolean(),
});

const deleteCommentSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
  commentId: z.string().min(1, 'commentId is required'),
});

export interface ToolHandlers {
  openmark_create_doc: (args: Record<string, unknown>) => Promise<string>;
  openmark_read_doc: (args: Record<string, unknown>) => Promise<string>;
  openmark_update_doc: (args: Record<string, unknown>) => Promise<string>;
  openmark_list_comments: (args: Record<string, unknown>) => Promise<string>;
  openmark_resolve_comment: (args: Record<string, unknown>) => Promise<string>;
  openmark_delete_comment: (args: Record<string, unknown>) => Promise<string>;
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

  async function openmark_list_comments(args: Record<string, unknown>): Promise<string> {
    const { slug } = listCommentsSchema.parse(args);
    const comments = await client.listComments(slug);

    if (comments.length === 0) return 'No comments on this document.';

    return comments
      .map((c) => {
        const anchor = c.anchorText ? ` (on: "${c.anchorText}")` : '';
        return `[${c.id}] ${c.resolved ? 'resolved' : 'open'} — ${c.authorName}${anchor}: ${c.content}`;
      })
      .join('\n');
  }

  async function openmark_resolve_comment(args: Record<string, unknown>): Promise<string> {
    const { slug, commentId, resolved } = resolveCommentSchema.parse(args);
    await client.resolveComment(slug, commentId, resolved);
    return `Comment ${commentId} marked ${resolved ? 'resolved' : 'unresolved'}`;
  }

  async function openmark_delete_comment(args: Record<string, unknown>): Promise<string> {
    const { slug, commentId } = deleteCommentSchema.parse(args);
    await client.deleteComment(slug, commentId);
    return `Deleted comment ${commentId}`;
  }

  return {
    openmark_create_doc,
    openmark_read_doc,
    openmark_update_doc,
    openmark_list_comments,
    openmark_resolve_comment,
    openmark_delete_comment,
  };
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

  server.tool(
    'openmark_list_comments',
    'List comments left on an openmark document.',
    { slug: z.string().describe('The 7-char slug or full openmark URL') },
    async ({ slug }) => ({
      content: [{ type: 'text' as const, text: await handlers.openmark_list_comments({ slug }) }],
    }),
  );

  server.tool(
    'openmark_resolve_comment',
    'Mark a comment on an openmark document as resolved or unresolved.',
    {
      slug: z.string().describe('The 7-char slug or full openmark URL'),
      commentId: z.string().describe('The comment id, from openmark_list_comments'),
      resolved: z.boolean().describe('true to resolve, false to unresolve'),
    },
    async ({ slug, commentId, resolved }) => ({
      content: [{ type: 'text' as const, text: await handlers.openmark_resolve_comment({ slug, commentId, resolved }) }],
    }),
  );

  server.tool(
    'openmark_delete_comment',
    'Delete a comment on an openmark document you own.',
    {
      slug: z.string().describe('The 7-char slug or full openmark URL'),
      commentId: z.string().describe('The comment id, from openmark_list_comments'),
    },
    async ({ slug, commentId }) => ({
      content: [{ type: 'text' as const, text: await handlers.openmark_delete_comment({ slug, commentId }) }],
    }),
  );
}
