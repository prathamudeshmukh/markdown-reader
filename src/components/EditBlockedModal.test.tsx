import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditBlockedModal from './EditBlockedModal';

const baseProps = {
  isUnowned: false,
  onClose: vi.fn(),
  onFork: vi.fn(),
  onSignIn: vi.fn(),
};

describe('EditBlockedModal', () => {
  describe('owned doc (isUnowned=false)', () => {
    it('shows "This document is read-only" title', () => {
      render(<EditBlockedModal {...baseProps} />);
      expect(screen.getByRole('heading')).toHaveTextContent('This document is read-only');
    });

    it('shows "someone else\'s document" body copy', () => {
      render(<EditBlockedModal {...baseProps} />);
      expect(screen.getByText(/someone else/i)).toBeInTheDocument();
    });

    it('shows "Sign in to edit" button', () => {
      render(<EditBlockedModal {...baseProps} />);
      expect(screen.getByRole('button', { name: /sign in to edit/i })).toBeInTheDocument();
    });

    it('shows "Make a copy" button', () => {
      render(<EditBlockedModal {...baseProps} />);
      expect(screen.getByRole('button', { name: /make a copy/i })).toBeInTheDocument();
    });

    it('calls onSignIn when "Sign in to edit" is clicked', () => {
      const onSignIn = vi.fn();
      render(<EditBlockedModal {...baseProps} onSignIn={onSignIn} />);
      fireEvent.click(screen.getByRole('button', { name: /sign in to edit/i }));
      expect(onSignIn).toHaveBeenCalledOnce();
    });

    it('calls onFork when "Make a copy" is clicked', () => {
      const onFork = vi.fn();
      render(<EditBlockedModal {...baseProps} onFork={onFork} />);
      fireEvent.click(screen.getByRole('button', { name: /make a copy/i }));
      expect(onFork).toHaveBeenCalledOnce();
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(<EditBlockedModal {...baseProps} onClose={onClose} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('unowned doc (isUnowned=true)', () => {
    const unownedProps = { ...baseProps, isUnowned: true };

    it('shows "This document has no owner" title', () => {
      render(<EditBlockedModal {...unownedProps} />);
      expect(screen.getByRole('heading')).toHaveTextContent('This document has no owner');
    });

    it('shows "Make a copy to edit" body copy', () => {
      render(<EditBlockedModal {...unownedProps} />);
      expect(screen.getByText(/make a copy to edit/i)).toBeInTheDocument();
    });

    it('does NOT show "Sign in to edit" button', () => {
      render(<EditBlockedModal {...unownedProps} />);
      expect(screen.queryByRole('button', { name: /sign in to edit/i })).not.toBeInTheDocument();
    });

    it('shows "Make a copy" button', () => {
      render(<EditBlockedModal {...unownedProps} />);
      expect(screen.getByRole('button', { name: /make a copy/i })).toBeInTheDocument();
    });

    it('calls onFork when "Make a copy" is clicked', () => {
      const onFork = vi.fn();
      render(<EditBlockedModal {...unownedProps} onFork={onFork} />);
      fireEvent.click(screen.getByRole('button', { name: /make a copy/i }));
      expect(onFork).toHaveBeenCalledOnce();
    });
  });
});
