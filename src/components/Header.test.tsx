import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header';

const defaults = {
  slug: null as string | null,
  mode: 'editor' as const,
  isSaving: false,
  markdownText: '',
  onToggle: vi.fn(),
  onSave: vi.fn(),
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
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('shows "Saving…" when saving', () => {
      render(<Header {...defaults} slug="abc1234" isSaving={true} />);
      expect(screen.getByText('Saving…')).toBeInTheDocument();
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
