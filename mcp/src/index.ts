#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OpenMarkClient } from './openmarkClient.js';
import { registerTools } from './tools.js';

const apiKey = process.env.OPENMARK_API_KEY;
if (!apiKey) {
  process.stderr.write('Error: OPENMARK_API_KEY is required.\n');
  process.stderr.write('Set it in your MCP server config: { "env": { "OPENMARK_API_KEY": "omk_..." } }\n');
  process.exit(1);
}

const baseUrl = process.env.OPENMARK_BASE_URL ?? 'https://openmark.cc';

const client = new OpenMarkClient({ apiKey, baseUrl });
const server = new McpServer({ name: 'openmark', version: '1.0.0' });

registerTools(server, client);

await server.connect(new StdioServerTransport());
