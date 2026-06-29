import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Preview from './Preview';

describe('Preview', () => {
  it('shows empty state when content is blank', () => {
    render(<Preview content="" />);
    expect(screen.getByText(/nothing to preview/i)).toBeInTheDocument();
  });

  it('shows empty state when content is only whitespace', () => {
    render(<Preview content={"   \n   "} />);
    expect(screen.getByText(/nothing to preview/i)).toBeInTheDocument();
  });

  it('renders markdown content', () => {
    render(<Preview content="# Hello World" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
  });

  it('renders a fenced code block', () => {
    const content = '```js\nconst x = 1;\n```';
    render(<Preview content={content} />);
    const code = document.querySelector('pre code');
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toContain('const x = 1;');
  });

  it('applies hljs and language class to fenced code blocks for syntax highlighting', () => {
    const content = '```javascript\nconst x = 1;\n```';
    render(<Preview content={content} />);
    const code = document.querySelector('pre code');
    expect(code?.className).toMatch(/hljs/);
    expect(code?.className).toMatch(/language-javascript/);
  });

  it('does not apply hljs class to inline code', () => {
    render(<Preview content="Use `console.log()` here." />);
    // Inline code should not have the hljs block styling
    const inline = document.querySelector('p code');
    expect(inline?.className ?? '').not.toMatch(/language-/);
  });

  it('sanitizes unsafe HTML while preserving hljs classes', () => {
    const content = '```js\nconst x = 1;\n```\n<script>alert("xss")</script>';
    render(<Preview content={content} />);
    expect(document.querySelector('script')).not.toBeInTheDocument();
    expect(document.querySelector('pre code')).toBeInTheDocument();
  });

  it('renders GFM tables', () => {
    const content = '| A | B |\n|---|---|\n| 1 | 2 |';
    render(<Preview content={content} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('applies monospace font class to prose wrapper to match editor font', () => {
    render(<Preview content="# Hello" />);
    const proseDiv = document.querySelector('.prose');
    expect(proseDiv).toHaveClass('font-mono');
  });

  it('sets data-preview-theme to "default" when no theme prop is passed', () => {
    render(<Preview content="# Hello" />);
    const wrapper = document.querySelector('[data-preview-theme]');
    expect(wrapper).toHaveAttribute('data-preview-theme', 'default');
  });

  it('sets data-preview-theme to the supplied theme id', () => {
    render(<Preview content="# Hello" theme="github" />);
    const wrapper = document.querySelector('[data-preview-theme]');
    expect(wrapper).toHaveAttribute('data-preview-theme', 'github');
  });

  describe('onSelectionChange', () => {
    it('fires with trimmed selection text on mouseup when text is selected', () => {
      const onSelectionChange = vi.fn();
      render(<Preview content="Hello world" onSelectionChange={onSelectionChange} />);

      const container = document.querySelector('[data-preview-theme]')!;

      // Simulate a non-collapsed selection
      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      // Override toString to return trimmed text
      vi.spyOn(selection, 'toString').mockReturnValue('  Hello world  ');

      fireEvent.mouseUp(container);

      expect(onSelectionChange).toHaveBeenCalledWith('Hello world');
    });

    it('fires null when selection is empty on mouseup', () => {
      const onSelectionChange = vi.fn();
      render(<Preview content="Hello world" onSelectionChange={onSelectionChange} />);

      const container = document.querySelector('[data-preview-theme]')!;
      window.getSelection()?.removeAllRanges();

      fireEvent.mouseUp(container);

      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });
  });

  describe('onLongPress', () => {
    it('triggers onLongPress with nearest block text after 500ms', async () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      render(<Preview content="Hello world paragraph" onLongPress={onLongPress} />);

      const container = document.querySelector('[data-preview-theme]')!;

      // Create a paragraph element in the DOM for elementFromPoint to return
      const para = document.createElement('p');
      para.textContent = 'Hello world paragraph';
      container.appendChild(para);

      const stub = vi.fn().mockReturnValue(para);
      Object.defineProperty(document, 'elementFromPoint', { value: stub, configurable: true, writable: true });

      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 200 }],
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledWith('Hello world paragraph', { x: 100, y: 200 });

      vi.useRealTimers();
    });

    it('does not trigger onLongPress when touch moves more than 10px before timer fires', async () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      render(<Preview content="Hello" onLongPress={onLongPress} />);

      const container = document.querySelector('[data-preview-theme]')!;

      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 115, clientY: 200 }] });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(onLongPress).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('does not trigger onLongPress when touchend fires before timer', async () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      render(<Preview content="Hello" onLongPress={onLongPress} />);

      const container = document.querySelector('[data-preview-theme]')!;

      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchEnd(container);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(onLongPress).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
