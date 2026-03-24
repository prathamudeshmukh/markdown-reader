import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header, { type DocumentState, type UiState, type HeaderActions } from './Header';

const defaultDocument: DocumentState = {
  slug: null,
  markdownText: '',
  presenceCount: 1,
};

const defaultUi: UiState = {
  mode: 'editor',
  isSaving: false,
  isLoading: false,
  copied: false,
  copiedMarkdown: false,
  sidebarOpen: false,
  isPdfImporting: false,
};

const defaultActions: HeaderActions = {
  onToggle: vi.fn(),
  onSave: vi.fn(),
  onNewDoc: vi.fn(),
  onExportPdf: vi.fn(),
  onDownloadMarkdown: vi.fn(),
  onCopyLink: vi.fn(),
  onCopyMarkdown: vi.fn(),
  onToggleSidebar: vi.fn(),
  onShowQr: vi.fn(),
  onImportPdf: vi.fn(),
};

function makeProps(overrides: {
  document?: Partial<DocumentState>;
  ui?: Partial<UiState>;
  actions?: Partial<HeaderActions>;
} = {}) {
  return {
    document: { ...defaultDocument, ...overrides.document },
    ui: { ...defaultUi, ...overrides.ui },
    actions: { ...defaultActions, ...overrides.actions },
  };
}

describe('Header', () => {
  describe('root page (no slug)', () => {
    it('shows a Save button', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('Save button is disabled when text is empty', () => {
      render(<Header {...makeProps({ document: { markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('Save button is enabled when text is non-empty', () => {
      render(<Header {...makeProps({ document: { markdownText: '# Hello' } })} />);
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

    it('calls onSave when Save is clicked', () => {
      const onSave = vi.fn();
      render(<Header {...makeProps({ document: { markdownText: '# Hello' }, actions: { onSave } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('doc page (with slug)', () => {
    it('does not show Save button', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' } })} />);
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('shows "Saved" when not saving', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, ui: { isSaving: false } })} />);
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });

    it('shows "Saving…" when saving', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, ui: { isSaving: true } })} />);
      expect(screen.getByText(/Saving…/)).toBeInTheDocument();
    });
  });

  describe('copy link button', () => {
    it('is disabled when no slug (unsaved doc)', () => {
      render(<Header {...makeProps({ document: { slug: null } })} />);
      expect(screen.getByRole('button', { name: 'Copy link' })).toBeDisabled();
    });

    it('is enabled when slug exists (saved doc)', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' } })} />);
      expect(screen.getByRole('button', { name: 'Copy link' })).not.toBeDisabled();
    });

    it('calls onCopyLink when clicked', () => {
      const onCopyLink = vi.fn();
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, actions: { onCopyLink } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(onCopyLink).toHaveBeenCalledOnce();
    });
  });

  describe('new doc button', () => {
    it('is disabled when no slug and text is empty', () => {
      render(<Header {...makeProps({ document: { slug: null, markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'New doc' })).toBeDisabled();
    });

    it('is enabled when text is non-empty (unsaved)', () => {
      render(<Header {...makeProps({ document: { slug: null, markdownText: '# Hello' } })} />);
      expect(screen.getByRole('button', { name: 'New doc' })).not.toBeDisabled();
    });

    it('is enabled when a slug exists', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234', markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'New doc' })).not.toBeDisabled();
    });

    it('calls onNewDoc when clicked', () => {
      const onNewDoc = vi.fn();
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, actions: { onNewDoc } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'New doc' }));
      expect(onNewDoc).toHaveBeenCalledOnce();
    });
  });

  describe('export PDF button', () => {
    it('is disabled when markdownText is empty', () => {
      render(<Header {...makeProps({ document: { markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'Export as PDF' })).toBeDisabled();
    });

    it('is enabled when markdownText is non-empty', () => {
      render(<Header {...makeProps({ document: { markdownText: '# Hello' } })} />);
      expect(screen.getByRole('button', { name: 'Export as PDF' })).not.toBeDisabled();
    });

    it('calls onExportPdf when clicked', () => {
      const onExportPdf = vi.fn();
      render(<Header {...makeProps({ document: { markdownText: '# Hello' }, actions: { onExportPdf } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Export as PDF' }));
      expect(onExportPdf).toHaveBeenCalledOnce();
    });
  });

  describe('QR code button', () => {
    it('is disabled when no slug', () => {
      render(<Header {...makeProps({ document: { slug: null } })} />);
      expect(screen.getByRole('button', { name: 'Show QR code' })).toBeDisabled();
    });

    it('is enabled when slug exists', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' } })} />);
      expect(screen.getByRole('button', { name: 'Show QR code' })).not.toBeDisabled();
    });

    it('calls onShowQr when clicked', () => {
      const onShowQr = vi.fn();
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, actions: { onShowQr } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }));
      expect(onShowQr).toHaveBeenCalledOnce();
    });
  });

  describe('import PDF button', () => {
    it('renders an Import PDF button', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Import PDF' })).toBeInTheDocument();
    });

    it('is disabled and shows spinner when isPdfImporting is true', () => {
      render(<Header {...makeProps({ ui: { isPdfImporting: true } })} />);
      expect(screen.getByRole('button', { name: 'Import PDF' })).toBeDisabled();
    });

    it('calls onImportPdf with the selected File when a file is chosen', () => {
      const onImportPdf = vi.fn();
      render(<Header {...makeProps({ actions: { onImportPdf } })} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(onImportPdf).toHaveBeenCalledWith(file);
    });

    it('allows the same file to be re-selected (input value reset after change)', () => {
      const onImportPdf = vi.fn();
      render(<Header {...makeProps({ actions: { onImportPdf } })} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(input.value).toBe('');
    });
  });

  describe('mode toggle', () => {
    it('shows "Show Preview" in editor mode', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Show Preview' })).toBeInTheDocument();
    });

    it('shows "Show Editor" in preview mode', () => {
      render(<Header {...makeProps({ ui: { mode: 'preview' } })} />);
      expect(screen.getByRole('button', { name: 'Show Editor' })).toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked', () => {
      const onToggle = vi.fn();
      render(<Header {...makeProps({ actions: { onToggle } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show Preview' }));
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });
});
