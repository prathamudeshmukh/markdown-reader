import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QrModal from './QrModal';

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }: { value: string }) => (
    <canvas data-testid="qr-canvas" data-value={value} />
  ),
}));

const TEST_URL = 'https://example.com/mreader/abc1234';

describe('QrModal', () => {
  it('renders a QR canvas with the correct URL', () => {
    render(<QrModal url={TEST_URL} onClose={vi.fn()} />);
    const canvas = screen.getByTestId('qr-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-value', TEST_URL);
  });

  it('displays the URL as text', () => {
    render(<QrModal url={TEST_URL} onClose={vi.fn()} />);
    expect(screen.getByText(TEST_URL)).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<QrModal url={TEST_URL} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('qr-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the X button is clicked', () => {
    const onClose = vi.fn();
    render(<QrModal url={TEST_URL} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<QrModal url={TEST_URL} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when a non-Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<QrModal url={TEST_URL} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders a Download PNG button', () => {
    render(<QrModal url={TEST_URL} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeInTheDocument();
  });
});
