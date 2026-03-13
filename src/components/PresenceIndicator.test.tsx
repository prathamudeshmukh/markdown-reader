import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PresenceIndicator from './PresenceIndicator';

describe('PresenceIndicator', () => {
  it('shows correct count for 2 users', () => {
    render(<PresenceIndicator count={2} />);
    expect(screen.getByText('2 editing')).toBeTruthy();
  });

  it('shows correct count for 5 users', () => {
    render(<PresenceIndicator count={5} />);
    expect(screen.getByText('5 editing')).toBeTruthy();
  });

  it('has accessible aria-label', () => {
    render(<PresenceIndicator count={3} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('3 users currently editing');
  });
});
