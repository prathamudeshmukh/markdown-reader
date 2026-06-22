import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { ProseNode as ProseNodeType } from '../../ai/beautifyTypes';

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

export default function ProseNode({ markdown }: ProseNodeType) {
  return (
    <div className="prose prose-sm sm:prose-base prose-headings:font-display max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
