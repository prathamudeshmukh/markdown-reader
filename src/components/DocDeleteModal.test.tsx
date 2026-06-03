import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocDeleteModal from './DocDeleteModal';

function makeProps(overrides: Partial<Parameters<typeof DocDeleteModal>[0]> = {}) {
  return {
    docTitle: 'My Doc',
    docSlug: 'abc1234',
    isDeleting: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('DocDeleteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the doc title in the confirmation message', () => {
    render(<DocDeleteModal {...makeProps()} />);
    expect(screen.getByText(/Delete "My Doc"\?/)).toBeInTheDocument();
  });

  it('renders the doc slug when title is null', () => {
    render(<DocDeleteModal {...makeProps({ docTitle: null })} />);
    expect(screen.getByText(/Delete "abc1234"\?/)).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<DocDeleteModal {...makeProps({ onCancel })} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DocDeleteModal {...makeProps({ onConfirm })} />);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn();
    render(<DocDeleteModal {...makeProps({ onCancel })} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables both buttons when isDeleting is true', () => {
    render(<DocDeleteModal {...makeProps({ isDeleting: true })} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('shows "Deleting…" text on the Delete button when isDeleting is true', () => {
    render(<DocDeleteModal {...makeProps({ isDeleting: true })} />);
    expect(screen.getByText('Deleting…')).toBeInTheDocument();
  });
});
