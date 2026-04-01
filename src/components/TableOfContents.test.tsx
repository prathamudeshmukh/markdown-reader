import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TableOfContents, { MobileToc } from './TableOfContents';
import { type Heading } from '../utils/headings';

const TWO_HEADINGS: Heading[] = [
  { id: 'intro', text: 'Introduction', level: 2 },
  { id: 'details', text: 'Details', level: 3 },
];

const ONE_HEADING: Heading[] = [
  { id: 'intro', text: 'Introduction', level: 2 },
];

describe('TableOfContents (desktop)', () => {
  it('renders null when fewer than 2 headings', () => {
    const { container } = render(
      <TableOfContents headings={ONE_HEADING} activeId={null} isOpen onToggle={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when only H1 headings are present', () => {
    const h1Only: Heading[] = [
      { id: 'title', text: 'Title', level: 1 },
      { id: 'subtitle', text: 'Subtitle', level: 1 },
    ];
    const { container } = render(
      <TableOfContents headings={h1Only} activeId={null} isOpen onToggle={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "On this page" header label when open', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId={null} isOpen onToggle={() => {}} />,
    );
    expect(screen.getByText(/on this page/i)).toBeInTheDocument();
  });

  it('renders all heading items when open', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId={null} isOpen onToggle={() => {}} />,
    );
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('hides item list and shows chevron expand affordance when closed', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId={null} isOpen={false} onToggle={() => {}} />,
    );
    expect(screen.queryByText('Introduction')).not.toBeInTheDocument();
    expect(screen.queryByText(/on this page/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand table of contents')).toBeInTheDocument();
  });

  it('collapsed chevron calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId={null} isOpen={false} onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByLabelText('Expand table of contents'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('highlights the active heading with accent colour', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId="intro" isOpen onToggle={() => {}} />,
    );
    const btn = screen.getByText('Introduction').closest('button')!;
    expect(btn.style.color).toContain('var(--accent)');
  });

  it('active heading has accent left-border indicator', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId="intro" isOpen onToggle={() => {}} />,
    );
    const btn = screen.getByText('Introduction').closest('button')!;
    expect(btn.style.borderLeft).toContain('var(--accent)');
  });

  it('active heading has accent background fill', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId="intro" isOpen onToggle={() => {}} />,
    );
    const btn = screen.getByText('Introduction').closest('button')!;
    expect(btn.style.backgroundColor).toContain('var(--accent)');
  });

  it('inactive heading has transparent left-border', () => {
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId="intro" isOpen onToggle={() => {}} />,
    );
    const btn = screen.getByText('Details').closest('button')!;
    expect(btn.style.borderLeft).toContain('transparent');
  });

  it('close button calls onToggle when open', () => {
    const onToggle = vi.fn();
    render(
      <TableOfContents headings={TWO_HEADINGS} activeId={null} isOpen onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByLabelText('Collapse table of contents'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('calls scrollIntoView when a heading link is clicked', () => {
    const scrollIntoView = vi.fn();
    const el = document.createElement('h2');
    el.id = 'intro';
    el.scrollIntoView = scrollIntoView;
    document.body.appendChild(el);

    render(
      <TableOfContents headings={TWO_HEADINGS} activeId={null} isOpen onToggle={() => {}} />,
    );
    fireEvent.click(screen.getByText('Introduction'));
    expect(scrollIntoView).toHaveBeenCalledOnce();

    document.body.removeChild(el);
  });

  it('applies deeper indent to h3 items than h2', () => {
    const headings: Heading[] = [
      { id: 'top', text: 'Top', level: 2 },
      { id: 'nested', text: 'Nested', level: 3 },
    ];
    render(<TableOfContents headings={headings} activeId={null} isOpen onToggle={() => {}} />);
    const topLi = screen.getByText('Top').closest('li')!;
    const nestedLi = screen.getByText('Nested').closest('li')!;
    // h3 should have a pl-3 class, h2 should not
    expect(nestedLi.className).toContain('pl-3');
    expect(topLi.className).not.toContain('pl-3');
  });

  it('filters out H1 headings from the list', () => {
    const headings: Heading[] = [
      { id: 'title', text: 'Document Title', level: 1 },
      { id: 'intro', text: 'Introduction', level: 2 },
      { id: 'details', text: 'Details', level: 2 },
    ];
    render(<TableOfContents headings={headings} activeId={null} isOpen onToggle={() => {}} />);
    expect(screen.queryByText('Document Title')).not.toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });
});

describe('MobileToc', () => {
  it('renders null when fewer than 2 headings', () => {
    const { container } = render(
      <MobileToc headings={ONE_HEADING} activeId={null} isOpen={false} onToggle={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <MobileToc headings={TWO_HEADINGS} activeId={null} isOpen={false} onToggle={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "On this page" header and heading list when open', () => {
    render(
      <MobileToc headings={TWO_HEADINGS} activeId={null} isOpen onToggle={() => {}} />,
    );
    expect(screen.getByText(/on this page/i)).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('hides drawer when isOpen is false', () => {
    render(
      <MobileToc headings={TWO_HEADINGS} activeId={null} isOpen={false} onToggle={() => {}} />,
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('close button inside drawer calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <MobileToc headings={TWO_HEADINGS} activeId={null} isOpen onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByLabelText('Close table of contents'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('backdrop click calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <MobileToc headings={TWO_HEADINGS} activeId={null} isOpen onToggle={onToggle} />,
    );
    // The backdrop div has aria-hidden="true"; find it by its unique aria attr
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('clicking a heading item scrolls then closes drawer', () => {
    const scrollIntoView = vi.fn();
    const el = document.createElement('h2');
    el.id = 'intro';
    el.scrollIntoView = scrollIntoView;
    document.body.appendChild(el);

    const onToggle = vi.fn();
    render(
      <MobileToc headings={TWO_HEADINGS} activeId={null} isOpen onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByText('Introduction'));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledOnce();

    document.body.removeChild(el);
  });

  it('filters out H1 headings from the drawer list', () => {
    const headings: Heading[] = [
      { id: 'title', text: 'Document Title', level: 1 },
      { id: 'intro', text: 'Introduction', level: 2 },
      { id: 'details', text: 'Details', level: 2 },
    ];
    render(<MobileToc headings={headings} activeId={null} isOpen onToggle={() => {}} />);
    expect(screen.queryByText('Document Title')).not.toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });
});
