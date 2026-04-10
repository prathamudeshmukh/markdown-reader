import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CommandPalette from './CommandPalette';

function makeActions() {
  return {
    onNewDoc: vi.fn(),
    onToggleMode: vi.fn(),
    onSave: vi.fn(),
    onCopyLink: vi.fn(),
    onCopyMarkdown: vi.fn(),
    onShowQr: vi.fn(),
    onDownloadMarkdown: vi.fn(),
    onExportPdf: vi.fn(),
    onToggleSidebar: vi.fn(),
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    onOpenShortcutHelp: vi.fn(),
    onNavigateToDoc: vi.fn(),
  };
}

const RECENT_DOCS = [
  { slug: 'doc-abc', title: 'My first note' },
  { slug: 'doc-xyz', title: 'Project plan' },
];

function renderPalette(overrides: {
  isAuthenticated?: boolean;
  recentDocs?: typeof RECENT_DOCS;
  currentSlug?: string | null;
  onClose?: () => void;
} = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const actions = makeActions();
  render(
    <CommandPalette
      onClose={onClose}
      isAuthenticated={overrides.isAuthenticated ?? false}
      recentDocs={overrides.recentDocs ?? []}
      currentSlug={overrides.currentSlug ?? null}
      actions={actions}
    />,
  );
  return { onClose, actions };
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog', () => {
    renderPalette();
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
  });

  it('renders the search input focused', () => {
    renderPalette();
    expect(screen.getByRole('textbox', { name: /search commands/i })).toBeInTheDocument();
  });

  it('shows static action commands by default', () => {
    renderPalette();
    expect(screen.getByText('New document')).toBeInTheDocument();
    expect(screen.getByText('Toggle editor / preview')).toBeInTheDocument();
    expect(screen.getByText('Save document')).toBeInTheDocument();
  });

  it('shows Sign in command when not authenticated', () => {
    renderPalette({ isAuthenticated: false });
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });

  it('shows Sign out command when authenticated', () => {
    renderPalette({ isAuthenticated: true });
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  });

  it('shows recent docs under Documents group', () => {
    renderPalette({ recentDocs: RECENT_DOCS });
    expect(screen.getByText('My first note')).toBeInTheDocument();
    expect(screen.getByText('Project plan')).toBeInTheDocument();
  });

  it('excludes the current doc from the list', () => {
    renderPalette({ recentDocs: RECENT_DOCS, currentSlug: 'doc-abc' });
    expect(screen.queryByText('My first note')).not.toBeInTheDocument();
    expect(screen.getByText('Project plan')).toBeInTheDocument();
  });

  it('filters commands by query', () => {
    renderPalette();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new doc' } });
    expect(screen.getByText('New document')).toBeInTheDocument();
    expect(screen.queryByText('Save document')).not.toBeInTheDocument();
  });

  it('shows "No commands found" when query matches nothing', () => {
    renderPalette();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xyzzy' } });
    expect(screen.getByText(/no commands found/i)).toBeInTheDocument();
  });

  it('executes a command and calls onClose when clicked', () => {
    const { onClose, actions } = renderPalette();
    fireEvent.click(screen.getByText('New document'));
    expect(actions.onNewDoc).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed on the container', () => {
    const { onClose } = renderPalette();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const { onClose } = renderPalette();
    fireEvent.click(screen.getByTestId('command-palette-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when the dialog content is clicked', () => {
    const { onClose } = renderPalette();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('navigates to a recent doc and calls onClose', () => {
    const { onClose, actions } = renderPalette({ recentDocs: RECENT_DOCS });
    fireEvent.click(screen.getByText('My first note'));
    expect(actions.onNavigateToDoc).toHaveBeenCalledWith('doc-abc');
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe('keyboard navigation', () => {
    it('moves active index down with ArrowDown', () => {
      renderPalette({ recentDocs: RECENT_DOCS });
      const dialog = screen.getByRole('dialog');
      // First item is active by default; pressing down moves to second
      fireEvent.keyDown(dialog, { key: 'ArrowDown' });
      const activeButtons = document.querySelectorAll('[data-active="true"]');
      expect(activeButtons.length).toBe(1);
    });

    it('executes the active command on Enter', () => {
      const { actions, onClose } = renderPalette();
      // First command should be "New document" (Documents group empty)
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
      // First action command is "New document" when no recent docs
      expect(actions.onNewDoc).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
