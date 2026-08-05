import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DiagramLightbox from './DiagramLightbox';

describe('DiagramLightbox', () => {
  it('renders the diagram image at a larger size', () => {
    render(<DiagramLightbox src="data:image/svg+xml;base64,AAA" alt="Diagram" onClose={vi.fn()} />);
    const img = screen.getByRole('img', { name: 'Diagram' });
    expect(img).toHaveAttribute('src', 'data:image/svg+xml;base64,AAA');
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<DiagramLightbox src="data:image/svg+xml;base64,AAA" alt="Diagram" onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the image itself is clicked', () => {
    const onClose = vi.fn();
    render(<DiagramLightbox src="data:image/svg+xml;base64,AAA" alt="Diagram" onClose={onClose} />);
    fireEvent.click(screen.getByRole('img', { name: 'Diagram' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<DiagramLightbox src="data:image/svg+xml;base64,AAA" alt="Diagram" onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
