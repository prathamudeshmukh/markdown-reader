import { forwardRef, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';

// Recursively extract plain text from React children so heading IDs are
// derived from visible text, not from "[object Object]".
function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children);
  return '';
}
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { slugify } from '../utils/headings';

// Allow highlight.js className attributes that rehype-highlight adds.
// rehype-highlight adds 'hljs' and 'language-*' to <code> and 'hljs-*' to <span>.
// Also allow id on heading elements for TOC anchor links.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', 'hljs', /^language-/]],
    span: [['className', /^hljs-/]],
    input: ['checked', 'disabled', 'type'],
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), 'input'],
};

// Track slug deduplication per render so duplicate heading IDs stay stable
// across a single markdown document.
function makeHeadingRenderer(level: 1 | 2 | 3 | 4, seen: Map<string, number>) {
  return function HeadingRenderer({ children, ...rest }: ComponentPropsWithoutRef<'h1' | 'h2' | 'h3' | 'h4'>) {
    const id = slugify(extractText(children), seen);
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
    return <Tag id={id} {...rest}>{children}</Tag>;
  };
}

interface PreviewProps {
  content: string;
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(function Preview({ content }, ref) {
  if (!content.trim()) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-sm animate-fade-in"
        style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}
      >
        Nothing to preview — switch to editor mode to add content.
      </div>
    );
  }

  // Build fresh dedup map per render so IDs always match what useHeadings extracts
  const seen = new Map<string, number>();

  return (
    <div ref={ref} className="flex-1 overflow-auto animate-mode-enter" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-10 pt-4 pb-10 prose prose-headings:font-display">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
          components={{
            h1: makeHeadingRenderer(1, seen),
            h2: makeHeadingRenderer(2, seen),
            h3: makeHeadingRenderer(3, seen),
            h4: makeHeadingRenderer(4, seen),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});

export default Preview;
