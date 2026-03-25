import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import type { User } from '@supabase/supabase-js';
import UserMenu from './UserMenu';

const mockUser = {
  id: '123',
  email: 'test@example.com',
  user_metadata: {},
} as User;

describe('UserMenu', () => {
  it('renders an avatar button with the first initial of the email', () => {
    render(<UserMenu user={mockUser} onSignOut={vi.fn()} />);
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('dropdown is not visible initially', () => {
    render(<UserMenu user={mockUser} onSignOut={vi.fn()} />);
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('opens dropdown when avatar is clicked', () => {
    render(<UserMenu user={mockUser} onSignOut={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows a Sign out button in the dropdown', () => {
    render(<UserMenu user={mockUser} onSignOut={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls onSignOut when Sign out is clicked', () => {
    const onSignOut = vi.fn();
    render(<UserMenu user={mockUser} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('closes dropdown on outside click', () => {
    render(<UserMenu user={mockUser} onSignOut={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('uses uppercase first letter of email as initial', () => {
    const user = { ...mockUser, email: 'alice@example.com' } as User;
    render(<UserMenu user={user} onSignOut={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
