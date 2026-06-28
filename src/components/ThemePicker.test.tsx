import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ThemePicker from './ThemePicker';
import { PREVIEW_THEMES } from '../themes/previewThemes';

describe('ThemePicker', () => {
  it('renders all 6 theme labels', () => {
    render(<ThemePicker current="default" onSelect={vi.fn()} onClose={vi.fn()} />);
    for (const theme of PREVIEW_THEMES) {
      expect(screen.getByText(theme.label)).toBeInTheDocument();
    }
  });

  it('marks the active theme with data-active', () => {
    render(<ThemePicker current="dracula" onSelect={vi.fn()} onClose={vi.fn()} />);
    const draculaBtn = screen.getByRole('button', { name: /dracula/i });
    expect(draculaBtn).toHaveAttribute('data-active', 'true');
  });

  it('other themes do not have data-active="true"', () => {
    render(<ThemePicker current="github" onSelect={vi.fn()} onClose={vi.fn()} />);
    const defaultBtn = screen.getByRole('button', { name: /default/i });
    expect(defaultBtn).not.toHaveAttribute('data-active', 'true');
  });

  it('calls onSelect with the clicked theme id', () => {
    const onSelect = vi.fn();
    render(<ThemePicker current="default" onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notion/i }));
    expect(onSelect).toHaveBeenCalledWith('notion');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ThemePicker current="default" onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
