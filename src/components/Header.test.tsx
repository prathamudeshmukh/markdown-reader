import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header';

import type { RecentDoc } from '../utils/recentDocs';

const sampleDocs: RecentDoc[] = [
  { slug: 'abc1234', savedAt: '2026-03-12T15:40:00.000Z' },
  { slug: 'xyz9999', savedAt: '2026-03-11T09:12:00.000Z' },
];

const defaults = {
  slug: null as string | null,
  mode: 'editor' as const,
  isSaving: false,
  isLoading: false,
  markdownText: '',
  recentDocs: [] as RecentDoc[],
  presenceCount: 1,
  onToggle: vi.fn(),
  onSave: vi.fn(),
  onNewDoc: vi.fn(),
  onExportPdf: vi.fn(),
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

  describe('recent docs history', () => {
    it('shows history button in disabled state when recentDocs is empty', () => {
      render(<Header {...defaults} recentDocs={[]} />);
      expect(screen.getByRole('button', { name: 'Recent docs' })).toBeDisabled();
    });

    it('shows history button when recentDocs has entries', () => {
      render(<Header {...defaults} recentDocs={sampleDocs} />);
      expect(screen.getByRole('button', { name: 'Recent docs' })).toBeInTheDocument();
    });

    it('opens dropdown when history button is clicked', () => {
      render(<Header {...defaults} recentDocs={sampleDocs} />);
      fireEvent.click(screen.getByRole('button', { name: 'Recent docs' }));
      expect(screen.getByText('abc1234')).toBeInTheDocument();
    });

    it('closes dropdown when history button is clicked again', () => {
      render(<Header {...defaults} recentDocs={sampleDocs} />);
      const btn = screen.getByRole('button', { name: 'Recent docs' });
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(screen.queryByText('abc1234')).not.toBeInTheDocument();
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

    it('copies current URL to clipboard when clicked', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      render(<Header {...defaults} slug="abc1234" />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(writeText).toHaveBeenCalledWith(window.location.href);
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
