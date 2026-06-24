import { useState } from 'react';
import type { FaqNode as FaqNodeType } from '../../ai/beautifyTypes';

export default function FaqNode({ items }: FaqNodeType) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            className="w-full text-left px-5 py-4 flex justify-between items-center font-medium"
            style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.question}
            <span>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
