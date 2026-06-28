import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocTitle from './DocTitle';

describe('DocTitle', () => {
  describe('preview mode', () => {
    it('renders nothing when title is null', () => {
      const { container } = render(
        <DocTitle title={null} mode="preview" onChange={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders the title in an h1', () => {
      render(<DocTitle title="My Document" mode="preview" onChange={vi.fn()} />);
      expect(screen.getByRole('heading', { level: 1, name: 'My Document' })).toBeInTheDocument();
    });

    it('renders the left accent bar', () => {
      render(<DocTitle title="My Document" mode="preview" onChange={vi.fn()} />);
      const bar = screen.getByTestId('title-bar');
      expect(bar).toBeInTheDocument();
      expect(bar.style.background).toContain('var(--accent)');
    });

    it('applies doc-title-preview class to h1 so theme CSS can override the font', () => {
      render(<DocTitle title="My Document" mode="preview" onChange={vi.fn()} />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveClass('doc-title-preview');
    });

    it('sets data-preview-theme to the supplied theme id', () => {
      render(<DocTitle title="My Document" mode="preview" onChange={vi.fn()} theme="github" />);
      const wrapper = document.querySelector('[data-preview-theme="github"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('defaults data-preview-theme to "default" when no theme is supplied', () => {
      render(<DocTitle title="My Document" mode="preview" onChange={vi.fn()} />);
      const wrapper = document.querySelector('[data-preview-theme="default"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('does not render the gradient divider', () => {
      const { container } = render(
        <DocTitle title="My Document" mode="preview" onChange={vi.fn()} />
      );
      const allDivs = container.querySelectorAll('div');
      const gradientDivider = Array.from(allDivs).find(
        (el) => el.style.background?.includes('linear-gradient')
      );
      expect(gradientDivider).toBeUndefined();
    });
  });

  describe('editor mode', () => {
    it('renders a textarea', () => {
      render(<DocTitle title="My Document" mode="editor" onChange={vi.fn()} />);
      expect(screen.getByRole('textbox', { name: /document title/i })).toBeInTheDocument();
    });

    it('renders the left bar', () => {
      render(<DocTitle title="My Document" mode="editor" onChange={vi.fn()} />);
      expect(screen.getByTestId('title-bar')).toBeInTheDocument();
    });

    it('textarea has no bottom border', () => {
      render(<DocTitle title="My Document" mode="editor" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox', { name: /document title/i });
      expect(textarea.style.borderBottom).toBe('');
    });

    it('calls onChange when value changes', () => {
      const onChange = vi.fn();
      render(<DocTitle title="" mode="editor" onChange={onChange} />);
      const textarea = screen.getByRole('textbox', { name: /document title/i });
      fireEvent.change(textarea, { target: { value: 'New Title' } });
      expect(onChange).toHaveBeenCalledWith('New Title');
    });

    it('prevents newlines on Enter key', () => {
      render(<DocTitle title="My Document" mode="editor" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox', { name: /document title/i });
      const event = fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(event).toBe(false);
    });
  });
});
