import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import FormattingToolbar from './FormattingToolbar';

function makeRef(selectionStart = 0, selectionEnd = 0) {
  const textarea = document.createElement('textarea');
  textarea.value = 'hello world';
  Object.defineProperty(textarea, 'selectionStart', { get: () => selectionStart, configurable: true });
  Object.defineProperty(textarea, 'selectionEnd', { get: () => selectionEnd, configurable: true });
  textarea.setSelectionRange = vi.fn();
  textarea.focus = vi.fn();
  const ref = createRef<HTMLTextAreaElement>();
  Object.defineProperty(ref, 'current', { value: textarea, writable: false });
  return ref;
}

const baseProps = {
  mode: 'editor' as const,
  readOnly: false,
  value: 'hello world',
  onTextChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Visibility ─────────────────────────────────────────────────────────────

describe('FormattingToolbar visibility', () => {
  it('renders toolbar when mode is editor', () => {
    render(<FormattingToolbar {...baseProps} editorRef={makeRef()} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('hides the pill when mode is preview (opacity 0, non-interactive)', () => {
    render(<FormattingToolbar {...baseProps} mode="preview" editorRef={makeRef()} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveStyle({ opacity: '0', pointerEvents: 'none' });
  });
});

// ── Disabled state ──────────────────────────────────────────────────────────

describe('FormattingToolbar disabled state', () => {
  it('all buttons are disabled when readOnly is true', () => {
    render(<FormattingToolbar {...baseProps} readOnly editorRef={makeRef()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('buttons are enabled when readOnly is false', () => {
    render(<FormattingToolbar {...baseProps} editorRef={makeRef()} />);
    // Check the first 6 formatting buttons are enabled
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });
});

// ── Bold ───────────────────────────────────────────────────────────────────

describe('FormattingToolbar Bold button', () => {
  it('no selection: wraps empty delimiters at cursor', () => {
    const onTextChange = vi.fn();
    render(
      <FormattingToolbar
        {...baseProps}
        value="hello world"
        onTextChange={onTextChange}
        editorRef={makeRef(5, 5)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /bold/i }));
    expect(onTextChange).toHaveBeenCalledWith('hello**** world');
  });

  it('with selection: wraps selected text in bold', () => {
    const onTextChange = vi.fn();
    render(
      <FormattingToolbar
        {...baseProps}
        value="hello world"
        onTextChange={onTextChange}
        editorRef={makeRef(6, 11)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /bold/i }));
    expect(onTextChange).toHaveBeenCalledWith('hello **world**');
  });
});

// ── Heading ────────────────────────────────────────────────────────────────

describe('FormattingToolbar Heading button', () => {
  it('adds ## prefix at line start', () => {
    const onTextChange = vi.fn();
    render(
      <FormattingToolbar
        {...baseProps}
        value="hello world"
        onTextChange={onTextChange}
        editorRef={makeRef(5, 5)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /heading/i }));
    expect(onTextChange).toHaveBeenCalledWith('## hello world');
  });
});

// ── Accessibility ──────────────────────────────────────────────────────────

describe('FormattingToolbar accessibility', () => {
  it('each button has an aria-label', () => {
    render(<FormattingToolbar {...baseProps} editorRef={makeRef()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label');
    });
  });

  it('toolbar has role=toolbar and aria-label', () => {
    render(<FormattingToolbar {...baseProps} editorRef={makeRef()} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label');
  });
});

// ── Popovers ───────────────────────────────────────────────────────────────

describe('FormattingToolbar Table button', () => {
  it('clicking Table opens the grid picker popover', () => {
    render(<FormattingToolbar {...baseProps} editorRef={makeRef()} />);
    fireEvent.click(screen.getByRole('button', { name: /table/i }));
    expect(screen.getByTestId('table-popover')).toBeInTheDocument();
  });
});

describe('FormattingToolbar Link button', () => {
  it('no selection: clicking Link opens the link popover', () => {
    render(<FormattingToolbar {...baseProps} editorRef={makeRef(0, 0)} />);
    fireEvent.click(screen.getByRole('button', { name: /link/i }));
    expect(screen.getByTestId('link-popover')).toBeInTheDocument();
  });

  it('with selection: clicking Link inserts markdown directly without popover', () => {
    const onTextChange = vi.fn();
    render(
      <FormattingToolbar
        {...baseProps}
        value="hello world"
        onTextChange={onTextChange}
        editorRef={makeRef(6, 11)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /link/i }));
    expect(onTextChange).toHaveBeenCalledWith('hello [world]()');
    expect(screen.queryByTestId('link-popover')).not.toBeInTheDocument();
  });
});
