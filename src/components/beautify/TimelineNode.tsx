import type { TimelineNode as TimelineNodeType } from '../../ai/beautifyTypes';

export default function TimelineNode({ items }: TimelineNodeType) {
  return (
    <ol className="relative space-y-6 pl-6" style={{ borderLeft: '2px solid var(--beautify-accent)' }}>
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.375rem] h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--beautify-accent)', top: '0.25rem' }} />
          <div className="space-y-0.5">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
            {item.date && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.date}</p>}
            {item.description && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
