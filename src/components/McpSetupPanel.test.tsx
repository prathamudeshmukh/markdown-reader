import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import McpSetupPanel from './McpSetupPanel';

describe('McpSetupPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('shows the Claude Code snippet by default with the key substituted', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    expect(screen.getByText(/omk_abc123/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claude Code' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to the Claude Desktop snippet when that tab is clicked, key still substituted', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Claude Desktop' }));
    expect(screen.getByText(/"OPENMARK_API_KEY": "omk_abc123"/)).toBeInTheDocument();
  });

  it('switches to the Cursor snippet when that tab is clicked, key still substituted', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cursor' }));
    expect(screen.getByText(/"OPENMARK_API_KEY": "omk_abc123"/)).toBeInTheDocument();
  });

  it('copies the full rendered snippet, not just the bare key, and flips the button label', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('claude mcp add openmark'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('omk_abc123'),
    );
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('renders the tab row and snippet block with wrap-friendly classes, not overflow-x-auto', () => {
    const { container } = render(<McpSetupPanel apiKey="omk_abc123" />);
    const tabRow = container.querySelector('[data-testid="mcp-setup-tabs"]');
    const snippet = container.querySelector('[data-testid="mcp-setup-snippet"]');

    expect(tabRow?.className).toContain('flex-wrap');
    expect(snippet?.className).toContain('whitespace-pre-wrap');
    expect(snippet?.className).toContain('break-all');
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
  });
});
