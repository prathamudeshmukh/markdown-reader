import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInitialize, mockRender } = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockRender: vi.fn(),
}));

vi.mock('mermaid', () => ({
  default: {
    initialize: mockInitialize,
    render: mockRender,
  },
}));

import { renderMermaidToDataUrl, MermaidSyntaxError } from './mermaidRenderer';

describe('renderMermaidToDataUrl', () => {
  beforeEach(() => {
    mockInitialize.mockReset();
    mockRender.mockReset();
  });

  it('initializes mermaid with strict security level and the theme config', async () => {
    mockRender.mockResolvedValue({ svg: '<svg></svg>' });
    await renderMermaidToDataUrl('flowchart TD\nA --> B', 'dracula');

    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: expect.objectContaining({ textColor: '#f8f8f2' }),
      }),
    );
  });

  it('renders the source and returns an svg+xml data URL', async () => {
    mockRender.mockResolvedValue({ svg: '<svg><text>hi</text></svg>' });
    const dataUrl = await renderMermaidToDataUrl('flowchart TD\nA --> B', 'default');

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    const [, base64] = dataUrl.split(',');
    expect(atob(base64)).toBe('<svg><text>hi</text></svg>');
  });

  it('passes the raw source straight through to mermaid.render', async () => {
    mockRender.mockResolvedValue({ svg: '<svg></svg>' });
    await renderMermaidToDataUrl('flowchart TD\nA --> B', 'default');

    expect(mockRender).toHaveBeenCalledWith(expect.any(String), 'flowchart TD\nA --> B');
  });

  it('uses a fresh element id on every call', async () => {
    mockRender.mockResolvedValue({ svg: '<svg></svg>' });
    await renderMermaidToDataUrl('flowchart TD\nA --> B', 'default');
    await renderMermaidToDataUrl('flowchart TD\nA --> B', 'default');

    const [firstId] = mockRender.mock.calls[0];
    const [secondId] = mockRender.mock.calls[1];
    expect(firstId).not.toBe(secondId);
  });

  it('replaces a percentage width with an absolute width/height derived from the viewBox', async () => {
    // Mermaid emits width="100%" with no height attribute — meant for inline
    // DOM embedding. As an <img> data URL that leaves the image with no
    // definite intrinsic size, so browsers stretch it to fill the column
    // instead of sizing it to the diagram's natural (usually much smaller)
    // dimensions. See docs/adr/0003 — diagrams render as <img>, not inline SVG.
    mockRender.mockResolvedValue({
      svg: '<svg id="x" width="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85.6 174" style="max-width: 85.6px;"><text>hi</text></svg>',
    });
    const dataUrl = await renderMermaidToDataUrl('flowchart TD\nA --> B', 'default');
    const [, base64] = dataUrl.split(',');
    const svg = atob(base64);

    expect(svg).toContain('width="85.6"');
    expect(svg).toContain('height="174"');
    expect(svg).not.toContain('width="100%"');
  });

  it('leaves an svg with no viewBox untouched', async () => {
    mockRender.mockResolvedValue({ svg: '<svg id="x"><text>hi</text></svg>' });
    const dataUrl = await renderMermaidToDataUrl('flowchart TD\nA --> B', 'default');
    const [, base64] = dataUrl.split(',');
    expect(atob(base64)).toBe('<svg id="x"><text>hi</text></svg>');
  });

  it('wraps a mermaid parse failure in MermaidSyntaxError with the original message', async () => {
    mockRender.mockRejectedValue(new Error('Parse error on line 1'));

    await expect(renderMermaidToDataUrl('not a diagram', 'default')).rejects.toThrow(
      MermaidSyntaxError,
    );
    await expect(renderMermaidToDataUrl('not a diagram', 'default')).rejects.toThrow(
      'Parse error on line 1',
    );
  });
});
