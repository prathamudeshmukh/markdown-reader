import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./hooks/useMarkdownState');
vi.mock('./hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn() }));
vi.mock('./hooks/useRecentDocs', () => ({ useRecentDocs: vi.fn(() => ({ status: 'ready', docs: [] })) }));
vi.mock('./hooks/useCollections', () => ({ useCollections: vi.fn(() => ({ state: { status: 'idle' }, refresh: vi.fn(), createCollection: vi.fn(), renameCollection: vi.fn(), deleteCollection: vi.fn(), moveDocToCollection: vi.fn() })) }));
vi.mock('./auth/AuthContext', () => ({ useAuth: vi.fn(() => ({ user: null, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() })) }));
vi.mock('./utils/creatorTokens', () => ({ loadCreatorToken: vi.fn(() => null) }));
vi.mock('./telemetry', () => ({
  track: vi.fn(),
  getContentLengthBucket: vi.fn(() => 'xs'),
}));

const { mockPdfToMarkdown, mockPdfFileToMarkdown, mockFeatureFlags } = vi.hoisted(() => ({
  mockPdfToMarkdown: vi.fn(),
  mockPdfFileToMarkdown: vi.fn(),
  mockFeatureFlags: { usePdfApi: false },
}));
vi.mock('./utils/pdfToMarkdown', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils/pdfToMarkdown')>();
  return { ...original, pdfToMarkdown: mockPdfToMarkdown };
});
vi.mock('./utils/pdfApiClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils/pdfApiClient')>();
  return { ...original, pdfFileToMarkdown: mockPdfFileToMarkdown };
});
vi.mock('./config/features', () => ({ readFeatureFlags: () => mockFeatureFlags }));
vi.mock('./components/QrModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="qr-modal"><button onClick={onClose}>close-qr</button></div>
  ),
}));

import App from './App';
import { useMarkdownState } from './hooks/useMarkdownState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuth } from './auth/AuthContext';
import { loadCreatorToken } from './utils/creatorTokens';
import { track } from './telemetry';
import { PdfImportError } from './utils/pdfToMarkdown';
import { PdfApiError } from './utils/pdfApiClient';

const baseState = {
  markdownText: '',
  title: null as string | null,
  slug: null as string | null,
  collectionId: null as string | null,
  mode: 'editor' as const,
  isLoading: false,
  isSaving: false,
  error: null as string | null,
  presenceCount: 1,
  setMarkdownText: vi.fn(),
  setTitle: vi.fn(),
  toggleMode: vi.fn(),
  onSave: vi.fn(),
  navigateToDoc: vi.fn(),
  docUserId: null as string | null,
};

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
    vi.mocked(useMarkdownState).mockReturnValue(baseState);
  });

  it('renders the editor in editor mode', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Start writing…')).toBeInTheDocument();
  });

  it('shows loading banner when isLoading is true', () => {
    vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, isLoading: true });
    render(<App />);
    expect(screen.getByLabelText('Loading document')).toBeInTheDocument();
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
      expect(track).toHaveBeenCalledWith('qr_opened', { has_slug: true });
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

  describe('copy actions', () => {
    it('tracks link copy once', async () => {
      vi.mocked(useMarkdownState).mockReturnValue({
        ...baseState,
        slug: 'abc1234',
        markdownText: '# Hello',
      });
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

      await Promise.resolve();
      expect(track).toHaveBeenCalledWith('link_copied', { has_slug: true, source: 'button' });
    });

    it('tracks markdown copy once', async () => {
      vi.mocked(useMarkdownState).mockReturnValue({
        ...baseState,
        slug: 'abc1234',
        markdownText: '# Hello',
      });
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy markdown' }));

      await Promise.resolve();
      expect(track).toHaveBeenCalledWith(
        'markdown_copied',
        expect.objectContaining({ content_length_bucket: expect.any(String) }),
      );
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
      fireEvent.click(screen.getByRole('button', { name: 'Export as…' }));
      fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
      expect(track).toHaveBeenCalledWith('pdf_exported', { mode_at_export: 'preview' });
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
      fireEvent.click(screen.getByRole('button', { name: 'Export as…' }));
      fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
      expect(track).toHaveBeenCalledWith('pdf_exported', { mode_at_export: 'editor' });
      expect(toggleMode).toHaveBeenCalledOnce();
      expect(print).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(print).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });
  });

  describe('import PDF', () => {
    function makeFile() {
      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      Object.assign(file, { arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
      return file;
    }

    it('populates editor with extracted markdown on success', async () => {
      const setMarkdownText = vi.fn();
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, setMarkdownText });
      mockPdfToMarkdown.mockResolvedValue({ markdown: '# Hello from PDF', pageCount: 1 });

      render(<App />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await vi.waitFor(() => expect(setMarkdownText).toHaveBeenCalledWith('# Hello from PDF'));
    });

    it('shows an error banner when PdfImportError is thrown', async () => {
      mockPdfToMarkdown.mockRejectedValue(new PdfImportError('EMPTY_PDF'));

      render(<App />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await vi.waitFor(() => expect(screen.getByText(/no text/i)).toBeInTheDocument());
    });

    it('shows a generic error banner for unknown errors', async () => {
      mockPdfToMarkdown.mockRejectedValue(new Error('Something went wrong'));

      render(<App />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await vi.waitFor(() => expect(screen.getByText(/failed to import/i)).toBeInTheDocument());
    });
  });

  describe('import PDF (API mode)', () => {
    function makeFile() {
      return new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    }

    beforeEach(() => {
      mockFeatureFlags.usePdfApi = true;
    });

    afterEach(() => {
      mockFeatureFlags.usePdfApi = false;
    });

    it('calls pdfFileToMarkdown instead of pdfToMarkdown when toggle is on', async () => {
      const setMarkdownText = vi.fn();
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, setMarkdownText });
      mockPdfFileToMarkdown.mockResolvedValue({ markdown: '# API result', pageCount: 2 });

      render(<App />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await vi.waitFor(() => expect(setMarkdownText).toHaveBeenCalledWith('# API result'));
      expect(mockPdfToMarkdown).not.toHaveBeenCalled();
    });

    it('shows error banner when PdfApiError is thrown', async () => {
      mockPdfFileToMarkdown.mockRejectedValue(new PdfApiError('CONVERSION_FAILED'));

      render(<App />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await vi.waitFor(() => expect(screen.getByText(/conversion service failed/i)).toBeInTheDocument());
    });

    it('shows generic error banner for unknown errors', async () => {
      mockPdfFileToMarkdown.mockRejectedValue(new Error('unexpected'));

      render(<App />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await vi.waitFor(() => expect(screen.getByText(/failed to import/i)).toBeInTheDocument());
    });
  });

  describe('canEdit — access control', () => {
    // Flow A: new unsaved doc — always editable
    it('new unsaved doc (no slug) is always editable', () => {
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: null, docUserId: null });
      render(<App />);
      expect(screen.getByPlaceholderText('Start writing…')).not.toHaveAttribute('readonly');
    });

    // Flow B/G: anon on unowned doc — editable
    it('anon visitor on unowned doc can edit', () => {
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: null });
      render(<App />);
      expect(screen.getByPlaceholderText('Start writing…')).not.toHaveAttribute('readonly');
    });

    // Flow B (after sign-up): auth user with creator token on unowned doc — editable
    it('authenticated user with creator token on unowned doc can edit', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-a' } as never, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
      vi.mocked(loadCreatorToken).mockReturnValue('valid-token');
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: null });
      render(<App />);
      expect(screen.getByPlaceholderText('Start writing…')).not.toHaveAttribute('readonly');
    });

    // Flow E: auth user without creator token on unowned doc — blocked
    it('authenticated user without creator token on unowned doc is blocked', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-b' } as never, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
      vi.mocked(loadCreatorToken).mockReturnValue(null);
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: null });
      render(<App />);
      expect(screen.getByPlaceholderText('Start writing…')).toHaveAttribute('readonly');
    });

    // Flow C: owner can edit their own doc
    it('authenticated owner of a doc can edit', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-a' } as never, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: 'user-a' });
      render(<App />);
      expect(screen.getByPlaceholderText('Start writing…')).not.toHaveAttribute('readonly');
    });

    // Flow D: different auth user on owned doc — blocked
    it('authenticated non-owner on someone else\'s doc is blocked', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-b' } as never, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: 'user-a' });
      render(<App />);
      expect(screen.getByPlaceholderText('Start writing…')).toHaveAttribute('readonly');
    });
  });

  describe('EditBlockedModal — isUnowned prop', () => {
    it('shows "no owner" copy when doc is unowned', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-b' } as never, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: null, mode: 'preview' });
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
      expect(screen.getByText(/this document has no owner/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /sign in to edit/i })).not.toBeInTheDocument();
    });

    it('shows "someone else\'s document" copy and sign-in button when doc is owned by another', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-b' } as never, isAuthLoading: false, signInWithEmail: vi.fn(), signOut: vi.fn() });
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234', docUserId: 'user-a', mode: 'preview' });
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
      expect(screen.getByText(/someone else/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in to edit/i })).toBeInTheDocument();
    });
  });

  describe('keyboard shortcut sources', () => {
    it('marks save source as shortcut', () => {
      const onSave = vi.fn();
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, onSave });
      render(<App />);

      const handlers = vi.mocked(useKeyboardShortcuts).mock.calls[0]?.[0];
      handlers?.onSave();

      expect(onSave).toHaveBeenCalledWith('shortcut');
    });

    it('marks toggle source as shortcut', () => {
      const toggleMode = vi.fn();
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, toggleMode });
      render(<App />);

      const handlers = vi.mocked(useKeyboardShortcuts).mock.calls[0]?.[0];
      handlers?.onToggleMode();

      expect(toggleMode).toHaveBeenCalledWith('shortcut');
    });

    it('marks copy-link source as shortcut', async () => {
      vi.mocked(useMarkdownState).mockReturnValue({ ...baseState, slug: 'abc1234' });
      render(<App />);

      const handlers = vi.mocked(useKeyboardShortcuts).mock.calls[0]?.[0];
      await handlers?.onCopyLink();

      expect(track).toHaveBeenCalledWith('link_copied', { has_slug: true, source: 'shortcut' });
    });
  });
});
