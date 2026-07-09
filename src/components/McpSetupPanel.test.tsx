import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import McpSetupPanel from './McpSetupPanel';

describe('McpSetupPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('expands the Claude Code section by default with the key substituted', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    expect(screen.getByRole('button', { name: /claude code/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/omk_abc123/)).toBeInTheDocument();
  });

  it('keeps other sections collapsed by default', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    expect(screen.getByRole('button', { name: /claude desktop/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /^cursor$/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands Claude Desktop and collapses Claude Code when clicked, key still substituted', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: /claude desktop/i }));

    expect(screen.getByRole('button', { name: /claude desktop/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /claude code/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/"OPENMARK_API_KEY": "omk_abc123"/)).toBeInTheDocument();
  });

  it('only keeps one section expanded at a time', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: /^cursor$/i }));
    fireEvent.click(screen.getByRole('button', { name: /claude desktop/i }));

    expect(screen.getByRole('button', { name: /^cursor$/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /claude desktop/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('copies the full rendered snippet of the expanded section, not just the bare key', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('claude mcp add openmark'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('omk_abc123'),
    );
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('resets the copied state when switching sections', () => {
    render(<McpSetupPanel apiKey="omk_abc123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /claude desktop/i }));
    expect(screen.getByRole('button', { name: 'Copy command' })).toBeInTheDocument();
  });

  it('renders the expanded snippet with wrap-friendly classes, not overflow-x-auto', () => {
    const { container } = render(<McpSetupPanel apiKey="omk_abc123" />);
    const snippet = container.querySelector('[data-testid="mcp-setup-snippet"]');

    expect(snippet?.className).toContain('whitespace-pre-wrap');
    expect(snippet?.className).toContain('break-all');
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
  });
});
