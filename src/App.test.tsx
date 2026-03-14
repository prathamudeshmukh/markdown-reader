import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./hooks/useMarkdownState');
vi.mock('./hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn() }));
vi.mock('./utils/recentDocs', () => ({ readRecentDocs: vi.fn(() => []) }));
vi.mock('./components/QrModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="qr-modal"><button onClick={onClose}>close-qr</button></div>
  ),
}));

import App from './App';
import { useMarkdownState } from './hooks/useMarkdownState';

const baseState = {
  markdownText: '',
  slug: null as string | null,
  mode: 'editor' as const,
  isLoading: false,
  isSaving: false,
  error: null as string | null,
  presenceCount: 1,
  setMarkdownText: vi.fn(),
  toggleMode: vi.fn(),
  onSave: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    vi.mocked(useMarkdownState).mockReturnValue(baseState);
  });

  it('renders the editor in editor mode', () => {
    render(<App />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows loading banner when isLoading is true', () => {
    vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, isLoading: true });
    render(<App />);
    expect(screen.getByText(/Loading…/)).toBeInTheDocument();
  });

  it('shows error banner when error is set', () => {
    vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, error: 'Not found' });
    render(<App />);
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('shows no banners in a clean state', () => {
    render(<App />);
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not found/)).not.toBeInTheDocument();
  });

  it('renders preview when mode is preview', () => {
    vi.mocked(useMarkdownState).mockReturnValue({
      ...baseState,
      mode: 'preview',
      markdownText: '# Hello',
    });
    render(<App />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  });

  describe('QR modal', () => {
    it('is not shown initially', () => {
      render(<App />);
      expect(screen.queryByTestId('qr-modal')).not.toBeInTheDocument();
    });

    it('opens when Show QR code button is clicked', () => {
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234' });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }));
      expect(screen.getByTestId('qr-modal')).toBeInTheDocument();
    });

    it('closes when onClose is called from within the modal', () => {
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234' });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }));
      fireEvent.click(screen.getByRole('button', { name: 'close-qr' }));
      expect(screen.queryByTestId('qr-modal')).not.toBeInTheDocument();
    });
  });

  describe('export PDF', () => {
    it('calls window.print directly when already in preview mode', () => {
      const print = vi.fn();
      vi.stubGlobal('print', print);
      vi.mocked(useMarkdownState).mockReturnValue({
        ...baseState,
        mode: 'preview',
        markdownText: '# Hello',
      });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Export as PDF' }));
      expect(print).toHaveBeenCalledOnce();
    });

    it('switches to preview then calls window.print when in editor mode', async () => {
      vi.useFakeTimers();
      const print = vi.fn();
      vi.stubGlobal('print', print);
      const toggleMode = vi.fn();
      vi.mocked(useMarkdownState).mockReturnValue({
        ...baseState,
        mode: 'editor',
        markdownText: '# Hello',
        toggleMode,
      });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Export as PDF' }));
      expect(toggleMode).toHaveBeenCalledOnce();
      expect(print).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(print).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });
  });
});
