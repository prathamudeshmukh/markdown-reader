import { useState } from 'react';
import { MCP_SETUP_SNIPPETS, renderMcpSetupSnippet, type McpClientId } from '../config/mcpSetupSnippets';

interface McpSetupPanelProps {
  apiKey: string;
}

export default function McpSetupPanel({ apiKey }: McpSetupPanelProps) {
  const [activeId, setActiveId] = useState<McpClientId>(MCP_SETUP_SNIPPETS[0].id);
  const [copied, setCopied] = useState(false);

  const active = MCP_SETUP_SNIPPETS.find((s) => s.id === activeId) ?? MCP_SETUP_SNIPPETS[0];
  const rendered = renderMcpSetupSnippet(active.template, apiKey);

  function handleSelect(id: McpClientId) {
    setActiveId(id);
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(rendered).catch(() => undefined);
    setCopied(true);
  }

  return (
    <div>
      <div data-testid="mcp-setup-tabs" className="flex flex-wrap gap-2 mb-3">
        {MCP_SETUP_SNIPPETS.map((snippet) => (
          <button
            key={snippet.id}
            type="button"
            aria-pressed={snippet.id === activeId}
            onClick={() => handleSelect(snippet.id)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{
              backgroundColor: snippet.id === activeId ? 'var(--accent)' : 'transparent',
              color: snippet.id === activeId ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {snippet.label}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-2">
        <pre
          data-testid="mcp-setup-snippet"
          className="flex-1 rounded px-2 py-1 text-xs whitespace-pre-wrap break-all"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          {rendered}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-sm px-3 py-1 rounded-lg font-medium"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
