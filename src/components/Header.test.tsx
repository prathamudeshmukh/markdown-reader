import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header';

const defaults = {
  slug: null as string | null,
  mode: 'editor' as const,
  isSaving: false,
  isLoading: false,
  markdownText: '',
  presenceCount: 1,
  copied: false,
  copiedMarkdown: false,
  sidebarOpen: false,
  isPdfImporting: false,
  onToggle: vi.fn(),
  onSave: vi.fn(),
  onNewDoc: vi.fn(),
  onExportPdf: vi.fn(),
  onCopyLink: vi.fn(),
  onCopyMarkdown: vi.fn(),
  onToggleSidebar: vi.fn(),
  onShowQr: vi.fn(),
  onImportPdf: vi.fn(),
};

describe('Header', () => {
  describe('root page (no slug)', () => {
    it('shows a Save button', () => {
      render(<Header {...defaults} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('Save button is disabled when text is empty', () => {
      render(<Header {...defaults} markdownText="" />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('Save button is enabled when text is non-empty', () => {
      render(<Header {...defaults} markdownText="# Hello" />);
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

    it('calls onSave when Save is clicked', () => {
      const onSave = vi.fn();
      render(<Header {...defaults} markdownText="# Hello" onSave={onSave} />);
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('doc page (with slug)', () => {
    it('does not show Save button', () => {
      render(<Header {...defaults} slug="abc1234" />);
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('shows "Saved" when not saving', () => {
      render(<Header {...defaults} slug="abc1234" isSaving={false} />);
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });

    it('shows "Saving…" when saving', () => {
      render(<Header {...defaults} slug="abc1234" isSaving={true} />);
      expect(screen.getByText(/Saving…/)).toBeInTheDocument();
    });
  });

  describe('copy link button', () => {
    it('is disabled when no slug (unsaved doc)', () => {
      render(<Header {...defaults} slug={null} />);
      expect(screen.getByRole('button', { name: 'Copy link' })).toBeDisabled();
    });

    it('is enabled when slug exists (saved doc)', () => {
      render(<Header {...defaults} slug="abc1234" />);
      expect(screen.getByRole('button', { name: 'Copy link' })).not.toBeDisabled();
    });

    it('calls onCopyLink when clicked', () => {
      const onCopyLink = vi.fn();
      render(<Header {...defaults} slug="abc1234" onCopyLink={onCopyLink} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(onCopyLink).toHaveBeenCalledOnce();
    });
  });

  describe('new doc button', () => {
    it('is disabled when no slug and text is empty', () => {
      render(<Header {...defaults} slug={null} markdownText="" />);
      expect(screen.getByRole('button', { name: 'New doc' })).toBeDisabled();
    });

    it('is enabled when text is non-empty (unsaved)', () => {
      render(<Header {...defaults} slug={null} markdownText="# Hello" />);
      expect(screen.getByRole('button', { name: 'New doc' })).not.toBeDisabled();
    });

    it('is enabled when a slug exists', () => {
      render(<Header {...defaults} slug="abc1234" markdownText="" />);
      expect(screen.getByRole('button', { name: 'New doc' })).not.toBeDisabled();
    });

    it('calls onNewDoc when clicked', () => {
      const onNewDoc = vi.fn();
      render(<Header {...defaults} slug="abc1234" onNewDoc={onNewDoc} />);
      fireEvent.click(screen.getByRole('button', { name: 'New doc' }));
      expect(onNewDoc).toHaveBeenCalledOnce();
    });
  });

  describe('export PDF button', () => {
    it('is disabled when markdownText is empty', () => {
      render(<Header {...defaults} markdownText="" />);
      expect(screen.getByRole('button', { name: 'Export as PDF' })).toBeDisabled();
    });

    it('is enabled when markdownText is non-empty', () => {
      render(<Header {...defaults} markdownText="# Hello" />);
      expect(screen.getByRole('button', { name: 'Export as PDF' })).not.toBeDisabled();
    });

    it('calls onExportPdf when clicked', () => {
      const onExportPdf = vi.fn();
      render(<Header {...defaults} markdownText="# Hello" onExportPdf={onExportPdf} />);
      fireEvent.click(screen.getByRole('button', { name: 'Export as PDF' }));
      expect(onExportPdf).toHaveBeenCalledOnce();
    });
  });

  describe('QR code button', () => {
    it('is disabled when no slug', () => {
      render(<Header {...defaults} slug={null} />);
      expect(screen.getByRole('button', { name: 'Show QR code' })).toBeDisabled();
    });

    it('is enabled when slug exists', () => {
      render(<Header {...defaults} slug="abc1234" />);
      expect(screen.getByRole('button', { name: 'Show QR code' })).not.toBeDisabled();
    });

    it('calls onShowQr when clicked', () => {
      const onShowQr = vi.fn();
      render(<Header {...defaults} slug="abc1234" onShowQr={onShowQr} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }));
      expect(onShowQr).toHaveBeenCalledOnce();
    });
  });

  describe('import PDF button', () => {
    it('renders an Import PDF button', () => {
      render(<Header {...defaults} />);
      expect(screen.getByRole('button', { name: 'Import PDF' })).toBeInTheDocument();
    });

    it('is disabled and shows spinner when isPdfImporting is true', () => {
      render(<Header {...defaults} isPdfImporting={true} />);
      expect(screen.getByRole('button', { name: 'Import PDF' })).toBeDisabled();
    });

    it('calls onImportPdf with the selected File when a file is chosen', () => {
      const onImportPdf = vi.fn();
      render(<Header {...defaults} onImportPdf={onImportPdf} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(onImportPdf).toHaveBeenCalledWith(file);
    });

    it('allows the same file to be re-selected (input value reset after change)', () => {
      const onImportPdf = vi.fn();
      render(<Header {...defaults} onImportPdf={onImportPdf} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(input.value).toBe('');
    });
  });

  describe('mode toggle', () => {
    it('shows "Show Preview" in editor mode', () => {
      render(<Header {...defaults} />);
      expect(screen.getByRole('button', { name: 'Show Preview' })).toBeInTheDocument();
    });

    it('shows "Show Editor" in preview mode', () => {
      render(<Header {...defaults} mode="preview" />);
      expect(screen.getByRole('button', { name: 'Show Editor' })).toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked', () => {
      const onToggle = vi.fn();
      render(<Header {...defaults} onToggle={onToggle} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show Preview' }));
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });
});
