import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Preview from './Preview';

describe('Preview — empty state', () => {
  it('shows empty state when content is blank', () => {
    render(<Preview content="" />);
    expect(screen.getByText(/nothing to preview/i)).toBeInTheDocument();
  });

  it('shows empty state when content is only whitespace', () => {
    render(<Preview content={"   \n   "} />);
    expect(screen.getByText(/nothing to preview/i)).toBeInTheDocument();
  });
});

describe('Preview — headings', () => {
  it('renders h1 heading', () => {
    render(<Preview content="# Hello World" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
  });

  it('renders h2 heading', () => {
    render(<Preview content="## Section" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument();
  });

  it('renders h3 heading', () => {
    render(<Preview content="### Sub-section" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Sub-section' })).toBeInTheDocument();
  });

  it('renders h4 heading', () => {
    render(<Preview content="#### Detail" />);
    expect(screen.getByRole('heading', { level: 4, name: 'Detail' })).toBeInTheDocument();
  });
});

describe('Preview — heading IDs for TOC', () => {
  it('injects id on h1', () => {
    render(<Preview content="# Hello World" />);
    expect(document.querySelector('h1')?.id).toBe('hello-world');
  });

  it('injects id on h2', () => {
    render(<Preview content="## My Section" />);
    expect(document.querySelector('h2')?.id).toBe('my-section');
  });

  it('injects id on h3', () => {
    render(<Preview content="### Deep Dive" />);
    expect(document.querySelector('h3')?.id).toBe('deep-dive');
  });

  it('injects id on h4', () => {
    render(<Preview content="#### Fine Detail" />);
    expect(document.querySelector('h4')?.id).toBe('fine-detail');
  });

  it('strips inline bold from heading id', () => {
    render(<Preview content="## **Bold** Title" />);
    expect(document.querySelector('h2')?.id).toBe('bold-title');
  });

  it('strips inline code from heading id', () => {
    render(<Preview content="## Use `code` Here" />);
    expect(document.querySelector('h2')?.id).toBe('use-code-here');
  });

  it('deduplicates duplicate heading ids with -2 suffix', () => {
    render(<Preview content={"## Intro\n\n## Intro"} />);
    const headings = document.querySelectorAll('h2');
    expect(headings[0].id).toBe('intro');
    expect(headings[1].id).toBe('intro-2');
  });

  it('deduplicates three identical headings', () => {
    render(<Preview content={"## Intro\n\n## Intro\n\n## Intro"} />);
    const headings = document.querySelectorAll('h2');
    expect(headings[0].id).toBe('intro');
    expect(headings[1].id).toBe('intro-2');
    expect(headings[2].id).toBe('intro-3');
  });
});

describe('Preview — ref forwarding', () => {
  it('forwards ref to the outer scroll container div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Preview content="## Content" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.classList).toContain('overflow-auto');
  });

  it('ref is null when content is empty (empty state rendered)', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Preview content="" ref={ref} />);
    expect(ref.current).toBeNull();
  });
});

describe('Preview — code blocks', () => {
  it('renders a fenced code block', () => {
    render(<Preview content={"```js\nconst x = 1;\n```"} />);
    const code = document.querySelector('pre code');
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toContain('const x = 1;');
  });

  it('applies hljs and language class for syntax highlighting', () => {
    render(<Preview content={"```javascript\nconst x = 1;\n```"} />);
    const code = document.querySelector('pre code');
    expect(code?.className).toMatch(/hljs/);
    expect(code?.className).toMatch(/language-javascript/);
  });

  it('does not apply language class to inline code', () => {
    render(<Preview content="Use `console.log()` here." />);
    const inline = document.querySelector('p code');
    expect(inline?.className ?? '').not.toMatch(/language-/);
  });
});

describe('Preview — security', () => {
  it('strips script tags', () => {
    render(<Preview content={'hello\n\n<script>alert("xss")</script>'} />);
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('strips onclick attributes from raw HTML', () => {
    render(<Preview content={'<div onclick="evil()">click</div>'} />);
    expect(document.querySelector('[onclick]')).not.toBeInTheDocument();
  });

  it('preserves hljs classes after sanitization', () => {
    render(<Preview content={"```js\nconst x = 1;\n```\n\n<script>bad</script>"} />);
    expect(document.querySelector('script')).not.toBeInTheDocument();
    expect(document.querySelector('pre code')).toBeInTheDocument();
  });
});

describe('Preview — GFM features', () => {
  it('renders a table', () => {
    render(<Preview content={"| A | B |\n|---|---|\n| 1 | 2 |"} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders table header cells', () => {
    render(<Preview content={"| Name | Age |\n|------|-----|\n| Alice | 30 |"} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('renders a GFM task list checkbox', () => {
    render(<Preview content={"- [x] Done\n- [ ] Pending"} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('renders strikethrough text', () => {
    render(<Preview content="~~deleted~~" />);
    expect(document.querySelector('del')).toBeInTheDocument();
  });

  it('renders a blockquote', () => {
    render(<Preview content="> A quoted line" />);
    expect(document.querySelector('blockquote')).toBeInTheDocument();
    expect(screen.getByText('A quoted line')).toBeInTheDocument();
  });

  it('renders a horizontal rule', () => {
    render(<Preview content={"Above\n\n---\n\nBelow"} />);
    expect(document.querySelector('hr')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<Preview content="**important**" />);
    expect(document.querySelector('strong')).toBeInTheDocument();
    expect(screen.getByText('important')).toBeInTheDocument();
  });

  it('renders italic text', () => {
    render(<Preview content="*emphasis*" />);
    expect(document.querySelector('em')).toBeInTheDocument();
    expect(screen.getByText('emphasis')).toBeInTheDocument();
  });

  it('renders an anchor link', () => {
    render(<Preview content="[Visit](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'Visit' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders an unordered list', () => {
    render(<Preview content={"- Alpha\n- Beta\n- Gamma"} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders an ordered list', () => {
    render(<Preview content={"1. First\n2. Second"} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('First')).toBeInTheDocument();
  });
});
