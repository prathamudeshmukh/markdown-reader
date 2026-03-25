import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import EmailSignInModal from './EmailSignInModal';

function renderModal(overrides: {
  onSubmit?: (email: string) => Promise<{ error: string | null }>;
  onClose?: () => void;
} = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn().mockResolvedValue({ error: null });
  const onClose = overrides.onClose ?? vi.fn();
  return { onSubmit, onClose, ...render(<EmailSignInModal onSubmit={onSubmit} onClose={onClose} />) };
}

describe('EmailSignInModal', () => {
  it('renders an email input', () => {
    renderModal();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('renders a Send magic link button', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('does not call onSubmit when email is empty', async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when email format is invalid', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'notanemail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the entered email on valid submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: null });
    renderModal({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(onSubmit).toHaveBeenCalledWith('user@example.com');
  });

  it('disables the button while submitting', () => {
    const onSubmit = vi.fn(() => new Promise<{ error: null }>(() => {}));
    renderModal({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    // Button label switches to "Sending…" and becomes disabled
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('shows success message after email is sent', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: null });
    renderModal({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument());
  });

  it('shows error message when submission fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Email rate limit exceeded' });
    renderModal({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    await waitFor(() => expect(screen.getByText(/email rate limit exceeded/i)).toBeInTheDocument());
  });

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId('signin-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when the modal content is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
