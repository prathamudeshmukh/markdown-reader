import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PresenceIndicator from './PresenceIndicator';

describe('PresenceIndicator', () => {
  it('shows correct count for 2 users', () => {
    render(<PresenceIndicator count={2} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('2');
    expect(status.textContent).toContain('editing');
  });

  it('shows correct count for 5 users', () => {
    render(<PresenceIndicator count={5} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('5');
    expect(status.textContent).toContain('editing');
  });

  it('has accessible aria-label', () => {
    render(<PresenceIndicator count={3} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('3 users currently editing');
  });
});
