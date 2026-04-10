import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ShortcutHelpModal from './ShortcutHelpModal';

function renderModal(onClose = vi.fn()) {
  return { onClose, ...render(<ShortcutHelpModal onClose={onClose} />) };
}

describe('ShortcutHelpModal', () => {
  it('renders the dialog with correct label', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it('renders all shortcut group headings', () => {
    renderModal();
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders expected shortcut descriptions', () => {
    renderModal();
    expect(screen.getByText('Save document')).toBeInTheDocument();
    expect(screen.getByText('New document')).toBeInTheDocument();
    expect(screen.getByText('Copy share link')).toBeInTheDocument();
    expect(screen.getByText('Toggle editor / preview')).toBeInTheDocument();
    expect(screen.getByText('Open command palette')).toBeInTheDocument();
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId('shortcut-help-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when the modal content is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
