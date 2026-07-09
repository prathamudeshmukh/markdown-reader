import { useState } from 'react';
import { MCP_SETUP_SNIPPETS, renderMcpSetupSnippet, type McpClientId } from '../config/mcpSetupSnippets';

interface McpSetupPanelProps {
  apiKey: string;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function McpSetupPanel({ apiKey }: McpSetupPanelProps) {
  const [expandedId, setExpandedId] = useState<McpClientId>(MCP_SETUP_SNIPPETS[0].id);
  const [copiedId, setCopiedId] = useState<McpClientId | null>(null);

  function handleToggle(id: McpClientId) {
    setExpandedId(id);
    setCopiedId(null);
  }

  function handleCopy(id: McpClientId, rendered: string) {
    navigator.clipboard.writeText(rendered).catch(() => undefined);
    setCopiedId(id);
  }

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Connect an AI coding agent — expand your client below.
      </p>
      <div className="space-y-2">
        {MCP_SETUP_SNIPPETS.map((snippet) => {
          const isOpen = snippet.id === expandedId;
          const rendered = renderMcpSetupSnippet(snippet.template, apiKey);

          return (
            <div
              key={snippet.id}
              className="rounded-xl overflow-hidden"
              style={{
                border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: isOpen ? 'var(--selection-bg)' : 'transparent',
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => handleToggle(snippet.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium"
                style={{ color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {snippet.label}
                <Chevron open={isOpen} />
              </button>

              {isOpen && (
                <div className="px-3 pb-3">
                  <pre
                    data-testid="mcp-setup-snippet"
                    className="rounded-lg px-2 py-1.5 text-xs whitespace-pre-wrap break-all mb-2"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {rendered}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(snippet.id, rendered)}
                    className="text-xs px-2.5 py-1 rounded-md font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {copiedId === snippet.id ? 'Copied!' : 'Copy command'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
