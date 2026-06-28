import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditAccessToggle from './EditAccessToggle';

describe('EditAccessToggle', () => {
  it('renders nothing when isOwner is false', () => {
    const { container } = render(
      <EditAccessToggle isOwner={false} editAccess={false} onToggle={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the toggle when isOwner is true', () => {
    render(<EditAccessToggle isOwner={true} editAccess={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('switch')).toBeTruthy();
  });

  it('shows unchecked state when editAccess is false', () => {
    render(<EditAccessToggle isOwner={true} editAccess={false} onToggle={vi.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('shows checked state when editAccess is true', () => {
    render(<EditAccessToggle isOwner={true} editAccess={true} onToggle={vi.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onToggle with true when toggled on', () => {
    const onToggle = vi.fn();
    render(<EditAccessToggle isOwner={true} editAccess={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle with false when toggled off', () => {
    const onToggle = vi.fn();
    render(<EditAccessToggle isOwner={true} editAccess={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('is disabled and does not call onToggle when pending', () => {
    const onToggle = vi.fn();
    render(<EditAccessToggle isOwner={true} editAccess={false} onToggle={onToggle} pending />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
