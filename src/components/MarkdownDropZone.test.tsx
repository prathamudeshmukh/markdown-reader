import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarkdownDropZone from './MarkdownDropZone';

function makeDragEvent(fileNamesAndTypes: [string, string][]) {
  const files = fileNamesAndTypes.map(([name, type]) => new File(['content'], name, { type }));
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: 0,
    clientY: 0,
    dataTransfer: {
      files,
      items: files.map((f) => ({ kind: 'file', type: f.type })),
    },
  };
}

describe('MarkdownDropZone', () => {
  it('renders children', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div data-testid="child">inner</div>
      </MarkdownDropZone>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows overlay on dragenter with a .md file', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    fireEvent.dragEnter(zone, makeDragEvent([['notes.md', 'text/markdown']]));
    expect(screen.getByTestId('md-drop-overlay')).toBeInTheDocument();
  });

  it('hides overlay on dragleave', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    fireEvent.dragEnter(zone, makeDragEvent([['notes.md', 'text/markdown']]));
    fireEvent.dragLeave(zone);
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('calls onFile with the dropped .md file and hides overlay', () => {
    const onFile = vi.fn();
    render(
      <MarkdownDropZone onFile={onFile} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([['notes.md', 'text/markdown']]);
    fireEvent.dragEnter(zone, evt);
    fireEvent.drop(zone, evt);
    expect(onFile).toHaveBeenCalledWith(evt.dataTransfer.files[0]);
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('calls onRejected and hides overlay when dropping an unsupported file', () => {
    const onRejected = vi.fn();
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={onRejected}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([['document.pdf', 'application/pdf']]);
    fireEvent.dragEnter(zone, evt);
    fireEvent.drop(zone, evt);
    expect(onRejected).toHaveBeenCalled();
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('calls onImageFiles with the dropped image and drop coordinates', () => {
    const onImageFiles = vi.fn();
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={onImageFiles} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([['photo.png', 'image/png']]);
    fireEvent.dragEnter(zone, evt);
    fireEvent.drop(zone, evt);
    expect(onImageFiles).toHaveBeenCalledWith(evt.dataTransfer.files, expect.any(Object));
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('calls onImageFiles with every image file when multiple are dropped together', () => {
    const onImageFiles = vi.fn();
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={onImageFiles} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([
      ['a.png', 'image/png'],
      ['b.jpg', 'image/jpeg'],
    ]);
    fireEvent.drop(zone, evt);
    expect(onImageFiles).toHaveBeenCalledWith(evt.dataTransfer.files, expect.any(Object));
  });

  it('routes only the image files to onImageFiles when an unsupported file is dropped alongside one', () => {
    const onImageFiles = vi.fn();
    const onRejected = vi.fn();
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={onImageFiles} onRejected={onRejected}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([
      ['photo.png', 'image/png'],
      ['notes.txt', 'text/plain'],
    ]);
    fireEvent.drop(zone, evt);
    expect(onImageFiles).toHaveBeenCalledWith([evt.dataTransfer.files[0]], expect.any(Object));
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('keeps the whole-document-replace behavior when the first file is .md, ignoring other files in the same drop', () => {
    const onFile = vi.fn();
    const onImageFiles = vi.fn();
    render(
      <MarkdownDropZone onFile={onFile} onImageFiles={onImageFiles} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([
      ['notes.md', 'text/markdown'],
      ['photo.png', 'image/png'],
    ]);
    fireEvent.drop(zone, evt);
    expect(onFile).toHaveBeenCalledWith(evt.dataTransfer.files[0]);
    expect(onImageFiles).not.toHaveBeenCalled();
  });

  it('shows an overlay label that covers both supported drop types', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    fireEvent.dragEnter(zone, makeDragEvent([['photo.png', 'image/png']]));
    expect(screen.getByTestId('md-drop-overlay')).toHaveTextContent('Drop Markdown or image file');
  });

  it('does not flicker: a dragenter/dragleave pair on a nested child keeps the overlay visible', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([['photo.png', 'image/png']]);

    // Entering the zone, then entering a nested child (net +2), then leaving
    // the child back to the zone (net +1) — browsers fire dragleave on the
    // parent when the pointer crosses into a child before dragenter fires on
    // the child, so a naive boolean toggle would flicker the overlay off here.
    fireEvent.dragEnter(zone, evt);
    fireEvent.dragEnter(zone, evt);
    fireEvent.dragLeave(zone, evt);
    expect(screen.getByTestId('md-drop-overlay')).toBeInTheDocument();
  });

  it('hides the overlay only once the net dragenter/dragleave count returns to zero', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    const evt = makeDragEvent([['photo.png', 'image/png']]);

    fireEvent.dragEnter(zone, evt);
    fireEvent.dragEnter(zone, evt);
    fireEvent.dragLeave(zone, evt);
    fireEvent.dragLeave(zone, evt);
    expect(screen.queryByTestId('md-drop-overlay')).not.toBeInTheDocument();
  });

  it('root div participates in flex layout so it fills its parent height', () => {
    render(
      <MarkdownDropZone onFile={vi.fn()} onImageFiles={vi.fn()} onRejected={vi.fn()}>
        <div>inner</div>
      </MarkdownDropZone>,
    );
    const zone = screen.getByTestId('md-drop-zone');
    expect(zone).toHaveClass('flex-1');
    expect(zone).toHaveClass('flex');
    expect(zone).toHaveClass('flex-col');
  });
});
