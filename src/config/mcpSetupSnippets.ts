export type McpClientId = 'claude-code' | 'claude-desktop' | 'cursor';

export interface McpSetupSnippet {
  id: McpClientId;
  label: string;
  template: string;
}

export const PLACEHOLDER_API_KEY = 'omk_your_key_here';

const DESKTOP_STYLE_CONFIG = `{
  "mcpServers": {
    "openmark": {
      "command": "npx",
      "args": ["-y", "@openmark/mcp"],
      "env": {
        "OPENMARK_API_KEY": "{{API_KEY}}"
      }
    }
  }
}`;

export const MCP_SETUP_SNIPPETS: readonly McpSetupSnippet[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    template: 'claude mcp add openmark -e OPENMARK_API_KEY={{API_KEY}} -- npx -y @openmark/mcp',
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    template: DESKTOP_STYLE_CONFIG,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    template: DESKTOP_STYLE_CONFIG,
  },
];

export function renderMcpSetupSnippet(template: string, apiKey: string): string {
  return template.split('{{API_KEY}}').join(apiKey);
}
