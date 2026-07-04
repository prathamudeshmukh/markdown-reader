import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import Header, { type DocumentState, type UiState, type ShareState, type ThemeState, type HeaderActions, type AuthState, type AuthActions } from './Header';

const defaultDocument: DocumentState = {
  slug: null,
  markdownText: '',
  presenceCount: 1,
};

const defaultUi: UiState = {
  mode: 'editor',
  isSaving: false,
  isLoading: false,
  copied: false,
  copiedMarkdown: false,
  sidebarOpen: false,
  isPdfImporting: false,
  commentsPanelOpen: false,
  unresolvedCommentCount: 0,
};

const defaultActions: HeaderActions = {
  onToggle: vi.fn(),
  onSave: vi.fn(),
  onNewDoc: vi.fn(),
  onExportPdf: vi.fn(),
  onDownloadMarkdown: vi.fn(),
  onCopyLink: vi.fn(),
  onCopyMarkdown: vi.fn(),
  onToggleSidebar: vi.fn(),
  onShowQr: vi.fn(),
  onImportPdf: vi.fn(),
  onOpenMdFile: vi.fn(),
  onToggleEditAccess: vi.fn(),
  onThemeChange: vi.fn(),
};

const defaultTheme: ThemeState = {
  theme: 'default',
};

const defaultShare: ShareState = {
  editAccess: false,
  isOwner: false,
  editAccessPending: false,
};

const defaultAuth: AuthState = {
  user: null,
  isAuthLoading: false,
};

const defaultAuthActions: AuthActions = {
  onSignInClick: vi.fn(),
  onSignOut: vi.fn(),
  onOpenApiKeys: vi.fn(),
  onOpenMcpSetup: vi.fn(),
};

function makeProps(overrides: {
  document?: Partial<DocumentState>;
  ui?: Partial<UiState>;
  share?: Partial<ShareState>;
  theme?: Partial<ThemeState>;
  actions?: Partial<HeaderActions>;
  auth?: Partial<AuthState>;
  authActions?: Partial<AuthActions>;
} = {}) {
  return {
    document: { ...defaultDocument, ...overrides.document },
    ui: { ...defaultUi, ...overrides.ui },
    share: { ...defaultShare, ...overrides.share },
    theme: { ...defaultTheme, ...overrides.theme },
    actions: { ...defaultActions, ...overrides.actions },
    auth: { ...defaultAuth, ...overrides.auth },
    authActions: { ...defaultAuthActions, ...overrides.authActions },
  };
}

/** Opens the Share dropdown by clicking the Share button. */
function openShare() {
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
}

/** Opens the File dropdown by clicking the File button. */
function openFile() {
  fireEvent.click(screen.getByRole('button', { name: 'File' }));
}

describe('Header', () => {
  describe('mobile layout', () => {
    it('pins right controls to grid column 3 so they stay right-aligned when mode toggle is hidden', () => {
      render(<Header {...makeProps()} />);
      const controls = document.querySelector('[data-testid="header-controls"]');
      expect(controls).toHaveClass('col-start-3');
    });
  });

  describe('root page (no slug)', () => {
    it('shows a Save button', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('Save button is disabled when text is empty', () => {
      render(<Header {...makeProps({ document: { markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('Save button is enabled when text is non-empty', () => {
      render(<Header {...makeProps({ document: { markdownText: '# Hello' } })} />);
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

    it('calls onSave when Save is clicked', () => {
      const onSave = vi.fn();
      render(<Header {...makeProps({ document: { markdownText: '# Hello' }, actions: { onSave } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('doc page (with slug)', () => {
    it('does not show Save button', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' } })} />);
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('shows "Saved" when not saving', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, ui: { isSaving: false } })} />);
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });

    it('shows "Saving…" when saving', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, ui: { isSaving: true } })} />);
      expect(screen.getByText(/Saving…/)).toBeInTheDocument();
    });
  });

  describe('mode toggle', () => {
    it('shows "Show Preview" in editor mode', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Show Preview' })).toBeInTheDocument();
    });

    it('shows "Show Editor" in preview mode', () => {
      render(<Header {...makeProps({ ui: { mode: 'preview' } })} />);
      expect(screen.getByRole('button', { name: 'Show Editor' })).toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked', () => {
      const onToggle = vi.fn();
      render(<Header {...makeProps({ actions: { onToggle } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show Preview' }));
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });

  describe('auth UI', () => {
    it('renders Sign in button when no user and not loading', () => {
      render(<Header {...makeProps({ auth: { user: null, isAuthLoading: false } })} />);
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('hides auth UI while loading', () => {
      render(<Header {...makeProps({ auth: { user: null, isAuthLoading: true } })} />);
      expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    });

    it('calls onSignInClick when Sign in is clicked', () => {
      const onSignInClick = vi.fn();
      render(<Header {...makeProps({ auth: { user: null, isAuthLoading: false }, authActions: { onSignInClick } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(onSignInClick).toHaveBeenCalledOnce();
    });

    it('renders UserMenu when user is signed in', () => {
      const mockUser = { id: '1', email: 'dev@example.com', user_metadata: {} } as User;
      render(<Header {...makeProps({ auth: { user: mockUser, isAuthLoading: false } })} />);
      expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
    });

    it('does not render Sign in button when user is signed in', () => {
      const mockUser = { id: '1', email: 'dev@example.com', user_metadata: {} } as User;
      render(<Header {...makeProps({ auth: { user: mockUser, isAuthLoading: false } })} />);
      expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    });

    it('calls onOpenMcpSetup when MCP Setup is clicked in the account menu', () => {
      const mockUser = { id: '1', email: 'dev@example.com', user_metadata: {} } as User;
      const onOpenMcpSetup = vi.fn();
      render(<Header {...makeProps({ auth: { user: mockUser, isAuthLoading: false }, authActions: { onOpenMcpSetup } })} />);

      fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
      fireEvent.click(screen.getByRole('button', { name: /mcp setup/i }));

      expect(onOpenMcpSetup).toHaveBeenCalledOnce();
    });
  });

  describe('Docs / Recent button', () => {
    it('shows "Recent" for unauthenticated users', () => {
      render(<Header {...makeProps({ auth: { user: null } })} />);
      expect(screen.getByRole('button', { name: /recent/i })).toBeInTheDocument();
    });

    it('shows "Docs" for authenticated users', () => {
      const mockUser = { id: '1', email: 'dev@example.com', user_metadata: {} } as User;
      render(<Header {...makeProps({ auth: { user: mockUser } })} />);
      expect(screen.getByRole('button', { name: 'Docs' })).toBeInTheDocument();
    });

    it('calls onToggleSidebar when clicked', () => {
      const onToggleSidebar = vi.fn();
      render(<Header {...makeProps({ actions: { onToggleSidebar } })} />);
      fireEvent.click(screen.getByRole('button', { name: /recent/i }));
      expect(onToggleSidebar).toHaveBeenCalledOnce();
    });
  });

  describe('New doc button', () => {
    it('is disabled when no slug and text is empty', () => {
      render(<Header {...makeProps({ document: { slug: null, markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'New doc' })).toBeDisabled();
    });

    it('is enabled when text is non-empty (unsaved)', () => {
      render(<Header {...makeProps({ document: { slug: null, markdownText: '# Hello' } })} />);
      expect(screen.getByRole('button', { name: 'New doc' })).not.toBeDisabled();
    });

    it('is enabled when a slug exists', () => {
      render(<Header {...makeProps({ document: { slug: 'abc1234', markdownText: '' } })} />);
      expect(screen.getByRole('button', { name: 'New doc' })).not.toBeDisabled();
    });

    it('calls onNewDoc when clicked', () => {
      const onNewDoc = vi.fn();
      render(<Header {...makeProps({ document: { slug: 'abc1234' }, actions: { onNewDoc } })} />);
      fireEvent.click(screen.getByRole('button', { name: 'New doc' }));
      expect(onNewDoc).toHaveBeenCalledOnce();
    });
  });

  describe('Share dropdown', () => {
    it('renders a Share button', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });

    it('is closed by default', () => {
      render(<Header {...makeProps()} />);
      expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
    });

    it('opens when Share is clicked', () => {
      render(<Header {...makeProps()} />);
      openShare();
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });

    it('closes when Share is clicked again', () => {
      render(<Header {...makeProps()} />);
      openShare();
      openShare();
      expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
    });

    it('closes when File dropdown is opened', () => {
      render(<Header {...makeProps()} />);
      openShare();
      openFile();
      expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
    });

    describe('Copy link item', () => {
      it('is disabled when no slug', () => {
        render(<Header {...makeProps({ document: { slug: null } })} />);
        openShare();
        expect(screen.getByRole('button', { name: /copy link/i })).toBeDisabled();
      });

      it('shows "Save first" hints when no slug', () => {
        render(<Header {...makeProps({ document: { slug: null } })} />);
        openShare();
        expect(screen.getAllByText('Save first')).toHaveLength(2);
      });

      it('is enabled when slug exists', () => {
        render(<Header {...makeProps({ document: { slug: 'abc1234' } })} />);
        openShare();
        expect(screen.getByRole('button', { name: /copy link/i })).not.toBeDisabled();
      });

      it('calls onCopyLink and closes dropdown when clicked', () => {
        const onCopyLink = vi.fn();
        render(<Header {...makeProps({ document: { slug: 'abc1234' }, actions: { onCopyLink } })} />);
        openShare();
        fireEvent.click(screen.getByRole('button', { name: /copy link/i }));
        expect(onCopyLink).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
      });
    });

    describe('Copy markdown item', () => {
      it('is disabled when markdownText is empty', () => {
        render(<Header {...makeProps({ document: { markdownText: '' } })} />);
        openShare();
        expect(screen.getByRole('button', { name: /copy markdown/i })).toBeDisabled();
      });

      it('is enabled when markdownText is non-empty', () => {
        render(<Header {...makeProps({ document: { markdownText: '# Hello' } })} />);
        openShare();
        expect(screen.getByRole('button', { name: /copy markdown/i })).not.toBeDisabled();
      });

      it('calls onCopyMarkdown and closes dropdown when clicked', () => {
        const onCopyMarkdown = vi.fn();
        render(<Header {...makeProps({ document: { markdownText: '# Hello' }, actions: { onCopyMarkdown } })} />);
        openShare();
        fireEvent.click(screen.getByRole('button', { name: /copy markdown/i }));
        expect(onCopyMarkdown).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: /copy markdown/i })).not.toBeInTheDocument();
      });
    });

    describe('QR code item', () => {
      it('is disabled when no slug', () => {
        render(<Header {...makeProps({ document: { slug: null } })} />);
        openShare();
        expect(screen.getByRole('button', { name: /show qr code/i })).toBeDisabled();
      });

      it('is enabled when slug exists', () => {
        render(<Header {...makeProps({ document: { slug: 'abc1234' } })} />);
        openShare();
        expect(screen.getByRole('button', { name: /show qr code/i })).not.toBeDisabled();
      });

      it('calls onShowQr and closes dropdown when clicked', () => {
        const onShowQr = vi.fn();
        render(<Header {...makeProps({ document: { slug: 'abc1234' }, actions: { onShowQr } })} />);
        openShare();
        fireEvent.click(screen.getByRole('button', { name: /show qr code/i }));
        expect(onShowQr).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: /show qr code/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('File dropdown', () => {
    it('renders a File button', () => {
      render(<Header {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'File' })).toBeInTheDocument();
    });

    it('is closed by default', () => {
      render(<Header {...makeProps()} />);
      expect(screen.queryByRole('button', { name: /open markdown file/i })).not.toBeInTheDocument();
    });

    it('opens when File is clicked', () => {
      render(<Header {...makeProps()} />);
      openFile();
      expect(screen.getByRole('button', { name: /open markdown file/i })).toBeInTheDocument();
    });

    it('closes when File is clicked again', () => {
      render(<Header {...makeProps()} />);
      openFile();
      openFile();
      expect(screen.queryByRole('button', { name: /open markdown file/i })).not.toBeInTheDocument();
    });

    it('closes when Share dropdown is opened', () => {
      render(<Header {...makeProps()} />);
      openFile();
      openShare();
      expect(screen.queryByRole('button', { name: /open markdown file/i })).not.toBeInTheDocument();
    });

    describe('Open file item', () => {
      it('calls onOpenMdFile and closes dropdown when clicked', () => {
        const onOpenMdFile = vi.fn();
        render(<Header {...makeProps({ actions: { onOpenMdFile } })} />);
        openFile();
        fireEvent.click(screen.getByRole('button', { name: /open markdown file/i }));
        expect(onOpenMdFile).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: /open markdown file/i })).not.toBeInTheDocument();
      });
    });

    describe('Import PDF item', () => {
      it('shows "Import PDF" when not importing', () => {
        render(<Header {...makeProps({ ui: { isPdfImporting: false } })} />);
        openFile();
        expect(screen.getByRole('button', { name: 'Import PDF' })).toBeInTheDocument();
      });

      it('is disabled and shows "Importing…" when isPdfImporting is true', () => {
        render(<Header {...makeProps({ ui: { isPdfImporting: true } })} />);
        openFile();
        expect(screen.getByRole('button', { name: /importing/i })).toBeDisabled();
      });

      it('calls onImportPdf with the selected file when file input changes', () => {
        const onImportPdf = vi.fn();
        render(<Header {...makeProps({ actions: { onImportPdf } })} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(onImportPdf).toHaveBeenCalledWith(file);
      });

      it('resets file input value after selection to allow re-selecting the same file', () => {
        render(<Header {...makeProps()} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(input.value).toBe('');
      });
    });

    describe('Export PDF item', () => {
      it('is disabled when markdownText is empty', () => {
        render(<Header {...makeProps({ document: { markdownText: '' } })} />);
        openFile();
        expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
      });

      it('is enabled when markdownText is non-empty', () => {
        render(<Header {...makeProps({ document: { markdownText: '# Hello' } })} />);
        openFile();
        expect(screen.getByRole('button', { name: 'PDF' })).not.toBeDisabled();
      });

      it('calls onExportPdf and closes dropdown when clicked', () => {
        const onExportPdf = vi.fn();
        render(<Header {...makeProps({ document: { markdownText: '# Hello' }, actions: { onExportPdf } })} />);
        openFile();
        fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
        expect(onExportPdf).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: 'PDF' })).not.toBeInTheDocument();
      });
    });

    describe('Export Markdown item', () => {
      it('is disabled when markdownText is empty', () => {
        render(<Header {...makeProps({ document: { markdownText: '' } })} />);
        openFile();
        expect(screen.getByRole('button', { name: 'Markdown' })).toBeDisabled();
      });

      it('is enabled when markdownText is non-empty', () => {
        render(<Header {...makeProps({ document: { markdownText: '# Hello' } })} />);
        openFile();
        expect(screen.getByRole('button', { name: 'Markdown' })).not.toBeDisabled();
      });

      it('calls onDownloadMarkdown and closes dropdown when clicked', () => {
        const onDownloadMarkdown = vi.fn();
        render(<Header {...makeProps({ document: { markdownText: '# Hello' }, actions: { onDownloadMarkdown } })} />);
        openFile();
        fireEvent.click(screen.getByRole('button', { name: 'Markdown' }));
        expect(onDownloadMarkdown).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: 'Markdown' })).not.toBeInTheDocument();
      });
    });
  });
});
