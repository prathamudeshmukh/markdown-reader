import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import OpenMdFileGuardModal from './OpenMdFileGuardModal';

function setup(open: boolean) {
  const onSaveAndOpen = vi.fn();
  const onDiscardAndOpen = vi.fn();
  const onCancel = vi.fn();
  render(
    <OpenMdFileGuardModal
      open={open}
      onSaveAndOpen={onSaveAndOpen}
      onDiscardAndOpen={onDiscardAndOpen}
      onCancel={onCancel}
    />,
  );
  return { onSaveAndOpen, onDiscardAndOpen, onCancel };
}

describe('OpenMdFileGuardModal', () => {
  it('does not render when open is false', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders all three action buttons when open', () => {
    setup(true);
    expect(screen.getByRole('button', { name: /save & open/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard & open/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onSaveAndOpen when "Save & Open" is clicked', async () => {
    const { onSaveAndOpen } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /save & open/i }));
    expect(onSaveAndOpen).toHaveBeenCalledOnce();
  });

  it('calls onDiscardAndOpen when "Discard & Open" is clicked', async () => {
    const { onDiscardAndOpen } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /discard & open/i }));
    expect(onDiscardAndOpen).toHaveBeenCalledOnce();
  });

  it('calls onCancel when "Cancel" is clicked', async () => {
    const { onCancel } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
