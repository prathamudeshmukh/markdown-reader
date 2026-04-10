import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

// Allow highlight.js className attributes that rehype-highlight adds.
// rehype-highlight adds 'hljs' and 'language-*' to <code> and 'hljs-*' to <span>.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', 'hljs', /^language-/]],
    span: [['className', /^hljs-/]],
    input: ['checked', 'disabled', 'type'],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), 'input'],
};

interface PreviewProps {
  content: string;
}

export default function Preview({ content }: PreviewProps) {
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

  return (
    <div className="flex-1 overflow-auto animate-mode-enter" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-3 sm:px-10 pt-4 pb-10 prose prose-headings:font-display">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
