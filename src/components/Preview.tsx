import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface PreviewProps {
  content: string;
}

export default function Preview({ content }: PreviewProps) {
  if (!content.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm dark:text-gray-600">
        Nothing to preview. Switch to editor mode to add content.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-8 prose prose-gray prose-headings:font-semibold dark:prose-invert">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
