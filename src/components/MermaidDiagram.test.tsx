import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockRenderMermaidToDataUrl, mockRegisterPendingRender, mockTrack } = vi.hoisted(() => ({
  mockRenderMermaidToDataUrl: vi.fn(),
  mockRegisterPendingRender: vi.fn(),
  mockTrack: vi.fn(),
}));

vi.mock('../diagrams/mermaidRenderer', () => ({
  renderMermaidToDataUrl: mockRenderMermaidToDataUrl,
}));

vi.mock('../diagrams/pendingDiagramRenders', () => ({
  registerPendingRender: mockRegisterPendingRender,
}));

vi.mock('../telemetry', () => ({
  track: mockTrack,
}));

import MermaidDiagram from './MermaidDiagram';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('MermaidDiagram', () => {
  beforeEach(() => {
    mockRenderMermaidToDataUrl.mockReset();
    mockRegisterPendingRender.mockReset();
    mockTrack.mockReset();
    vi.useRealTimers();
  });

  it('shows a loading skeleton while the diagram is rendering', () => {
    mockRenderMermaidToDataUrl.mockReturnValue(new Promise(() => {}));
    render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);
    expect(screen.getByTestId('diagram-skeleton')).toBeInTheDocument();
  });

  it('renders the diagram image once rendering succeeds', async () => {
    mockRenderMermaidToDataUrl.mockResolvedValue('data:image/svg+xml;base64,AAA');
    render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/svg+xml;base64,AAA');
  });

  it('registers the in-flight render with the pending-render registry', () => {
    const { promise } = deferred<string>();
    mockRenderMermaidToDataUrl.mockReturnValue(promise);
    render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);

    expect(mockRegisterPendingRender).toHaveBeenCalledWith(promise);
  });

  it('shows an inline error card and tracks diagram_render_failed on invalid syntax', async () => {
    mockRenderMermaidToDataUrl.mockRejectedValue(new Error('Parse error on line 1'));
    render(<MermaidDiagram source="not a diagram" theme="default" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Parse error on line 1');
    expect(mockTrack).toHaveBeenCalledWith('diagram_render_failed', { error_type: 'invalid_syntax' });
  });

  it('shows the raw diagram source inside the error card', async () => {
    mockRenderMermaidToDataUrl.mockRejectedValue(new Error('bad syntax'));
    render(<MermaidDiagram source="not a diagram" theme="default" />);

    await screen.findByRole('alert');
    expect(screen.getByText('not a diagram')).toBeInTheDocument();
  });

  it('opens the lightbox when the rendered diagram is clicked', async () => {
    mockRenderMermaidToDataUrl.mockResolvedValue('data:image/svg+xml;base64,AAA');
    render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);

    const img = await screen.findByRole('img');
    fireEvent.click(img);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders immediately on mount without waiting for a debounce window', () => {
    mockRenderMermaidToDataUrl.mockReturnValue(new Promise(() => {}));
    render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);
    expect(mockRenderMermaidToDataUrl).toHaveBeenCalledTimes(1);
  });

  it('debounces re-render when source changes rapidly', async () => {
    vi.useFakeTimers();
    mockRenderMermaidToDataUrl.mockResolvedValue('data:image/svg+xml;base64,AAA');
    const { rerender } = render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);
    expect(mockRenderMermaidToDataUrl).toHaveBeenCalledTimes(1);

    rerender(<MermaidDiagram source={"flowchart TD\nA --> C"} theme="default" />);
    rerender(<MermaidDiagram source={"flowchart TD\nA --> D"} theme="default" />);
    rerender(<MermaidDiagram source={"flowchart TD\nA --> E"} theme="default" />);

    expect(mockRenderMermaidToDataUrl).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(mockRenderMermaidToDataUrl).toHaveBeenCalledTimes(2);
    expect(mockRenderMermaidToDataUrl).toHaveBeenLastCalledWith('flowchart TD\nA --> E', 'default');
    vi.useRealTimers();
  });

  it('ignores a stale render that resolves after a newer one was kicked off', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    mockRenderMermaidToDataUrl.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    vi.useFakeTimers();
    const { rerender } = render(<MermaidDiagram source={"flowchart TD\nA --> B"} theme="default" />);
    rerender(<MermaidDiagram source={"flowchart TD\nA --> C"} theme="default" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    vi.useRealTimers();

    second.resolve('data:image/svg+xml;base64,SECOND');
    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/svg+xml;base64,SECOND'));

    first.resolve('data:image/svg+xml;base64,FIRST');
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/svg+xml;base64,SECOND');
  });
});
