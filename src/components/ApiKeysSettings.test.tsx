import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ApiKeysSettings from './ApiKeysSettings';

vi.mock('../hooks/useApiKeys', () => ({
  useApiKeys: vi.fn(),
}));

import { useApiKeys } from '../hooks/useApiKeys';

const mockKey = {
  id: 'key-1',
  label: 'CI bot',
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: null,
};

function makeHook(overrides: Partial<ReturnType<typeof useApiKeys>> = {}): ReturnType<typeof useApiKeys> {
  return {
    keys: [mockKey],
    isLoading: false,
    error: null,
    createKey: vi.fn().mockResolvedValue({ key: 'omk_newrawkey12345678901234567890' }),
    revokeKey: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ApiKeysSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the list of existing keys', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);
    expect(screen.getByText('CI bot')).toBeInTheDocument();
  });

  it('shows Never for last used when lastUsedAt is null', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);
    expect(screen.getByText(/never/i)).toBeInTheDocument();
  });

  it('renders a New API Key button', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);
    expect(screen.getByRole('button', { name: /new api key/i })).toBeInTheDocument();
  });

  it('opens create modal when New API Key is clicked', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);
    fireEvent.click(screen.getByRole('button', { name: /new api key/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows generated key in copy panel after successful create', async () => {
    const createKey = vi.fn().mockResolvedValue({ key: 'omk_newrawkey12345678901234567890' });
    vi.mocked(useApiKeys).mockReturnValue(makeHook({ createKey }));
    render(<ApiKeysSettings />);

    fireEvent.click(screen.getByRole('button', { name: /new api key/i }));

    const labelInput = screen.getByRole('textbox');
    fireEvent.change(labelInput, { target: { value: 'My key' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('omk_newrawkey12345678901234567890')).toBeInTheDocument();
    });
  });

  it('dismisses key copy panel when "I\'ve copied it" is clicked', async () => {
    const createKey = vi.fn().mockResolvedValue({ key: 'omk_abc' });
    vi.mocked(useApiKeys).mockReturnValue(makeHook({ createKey }));
    render(<ApiKeysSettings />);

    fireEvent.click(screen.getByRole('button', { name: /new api key/i }));
    const labelInput = screen.getByRole('textbox');
    fireEvent.change(labelInput, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => screen.getByText('omk_abc'));
    fireEvent.click(screen.getByRole('button', { name: /copied/i }));

    expect(screen.queryByText('omk_abc')).not.toBeInTheDocument();
  });

  it('shows revoke button for each key', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('opens revoke confirmation when revoke button is clicked', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('calls revokeKey only after confirmation', async () => {
    const revokeKey = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useApiKeys).mockReturnValue(makeHook({ revokeKey }));
    render(<ApiKeysSettings />);

    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    expect(revokeKey).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(revokeKey).toHaveBeenCalledWith('key-1'));
  });

  it('keeps the setup guide collapsed by default, with a toggle to expand it', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);

    expect(screen.queryByText(/omk_your_key_here/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /setup guide/i })).toBeInTheDocument();
  });

  it('expands the setup guide with the placeholder key when initialShowSetup is true', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings initialShowSetup />);

    expect(screen.getByText(/omk_your_key_here/)).toBeInTheDocument();
  });

  it('toggles the setup guide open and closed via the header button', () => {
    vi.mocked(useApiKeys).mockReturnValue(makeHook());
    render(<ApiKeysSettings />);

    fireEvent.click(screen.getByRole('button', { name: /setup guide/i }));
    expect(screen.getByText(/omk_your_key_here/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /setup guide/i }));
    expect(screen.queryByText(/omk_your_key_here/)).not.toBeInTheDocument();
  });

  it('auto-expands the setup guide with the real key after creating one', async () => {
    const createKey = vi.fn().mockResolvedValue({ key: 'omk_newrawkey12345678901234567890' });
    vi.mocked(useApiKeys).mockReturnValue(makeHook({ createKey }));
    render(<ApiKeysSettings />);

    fireEvent.click(screen.getByRole('button', { name: /new api key/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My key' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/OPENMARK_API_KEY=omk_newrawkey12345678901234567890/)).toBeInTheDocument();
    });
  });

  it('falls back to the placeholder key in the setup guide after dismissing the raw key, without unmounting it', async () => {
    const createKey = vi.fn().mockResolvedValue({ key: 'omk_newrawkey12345678901234567890' });
    vi.mocked(useApiKeys).mockReturnValue(makeHook({ createKey }));
    render(<ApiKeysSettings />);

    fireEvent.click(screen.getByRole('button', { name: /new api key/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My key' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => screen.getByText('omk_newrawkey12345678901234567890'));

    fireEvent.click(screen.getByRole('button', { name: /i've copied it/i }));

    expect(screen.queryByText('omk_newrawkey12345678901234567890')).not.toBeInTheDocument();
    expect(screen.getByText(/OPENMARK_API_KEY=omk_your_key_here/)).toBeInTheDocument();
  });
});
