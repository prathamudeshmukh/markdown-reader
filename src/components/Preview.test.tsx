import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
