import { describe, it, expect } from 'vitest';
import { MCP_SETUP_SNIPPETS, PLACEHOLDER_API_KEY, renderMcpSetupSnippet } from './mcpSetupSnippets';

describe('mcpSetupSnippets', () => {
  it('has exactly 3 entries with the expected ids and labels', () => {
    expect(MCP_SETUP_SNIPPETS.map((s) => s.id)).toEqual(['claude-code', 'claude-desktop', 'cursor']);
    expect(MCP_SETUP_SNIPPETS.map((s) => s.label)).toEqual(['Claude Code', 'Claude Desktop', 'Cursor']);
  });

  it('every template contains the {{API_KEY}} placeholder', () => {
    for (const snippet of MCP_SETUP_SNIPPETS) {
      expect(snippet.template).toContain('{{API_KEY}}');
    }
  });

  it('renders a snippet with the placeholder replaced everywhere it appears', () => {
    const rendered = renderMcpSetupSnippet(MCP_SETUP_SNIPPETS[1].template, 'omk_test123');
    expect(rendered).toContain('omk_test123');
    expect(rendered).not.toContain('{{API_KEY}}');
  });

  it('exports a placeholder key matching the README convention', () => {
    expect(PLACEHOLDER_API_KEY).toBe('omk_your_key_here');
  });
});
