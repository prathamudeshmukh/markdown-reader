import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarkdownDropZone from './MarkdownDropZone';

function makeDragEvent(fileName: string, type: string) {
  const file = new File(['content'], fileName, { type });
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      files: [file],
      items: [{ kind: 'file', type }],
    },
  };
}

describe('MarkdownDropZone', () => {
  it('renders children', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onRejected={vi.fn()}>
        <div data-testid="child">inner</div>
      </MarkdownDropZone>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows overlay on dragenter with a .md file', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    fireEvent.dragEnter(zone, makeDragEvent('notes.md', 'text/markdown'));
    expect(screen.getByTestId('md-drop-overlay')).toBeInTheDocument();
  });

  it('hides overlay on dragleave', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    fireEvent.dragEnter(zone, makeDragEvent('notes.md', 'text/markdown'));
    fireEvent.dragLeave(zone);
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('calls onFile with the dropped .md file and hides overlay', () => {
    const onFile = vi.fn();
    render(
      <MarkdownDropZone onFile={onFile} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent('notes.md', 'text/markdown');
    fireEvent.dragEnter(zone, evt);
    fireEvent.drop(zone, evt);
    expect(onFile).toHaveBeenCalledWith(evt.dataTransfer.files[0]);
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('calls onRejected and hides overlay when dropping a non-.md file', () => {
    const onRejected = vi.fn();
    render(
      <MarkdownDropZone onFile={vi.fn()} onRejected={onRejected}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent('photo.png', 'image/png');
    fireEvent.dragEnter(zone, evt);
    fireEvent.drop(zone, evt);
    expect(onRejected).toHaveBeenCalled();
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('root div participates in flex layout so it fills its parent height', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    expect(zone).toHaveClass('flex-1');
    expect(zone).toHaveClass('flex');
    expect(zone).toHaveClass('flex-col');
  });
});
