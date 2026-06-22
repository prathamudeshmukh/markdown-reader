import type { FaqNode as FaqNodeType } from '../../ai/beautifyTypes';

export default function FaqNode({ items }: FaqNodeType) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <details
          key={i}
          className="rounded-xl group"
          style={{ border: '1px solid var(--border)' }}
        >
          <summary
            className="flex items-center justify-between px-4 py-3 cursor-pointer list-none text-sm font-medium select-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.question}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              style={{ color: 'var(--text-muted)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="px-4 pb-4 pt-1">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {item.answer}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
