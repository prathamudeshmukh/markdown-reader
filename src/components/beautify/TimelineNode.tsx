import type { TimelineNode as TimelineNodeType } from '../../ai/beautifyTypes';

export default function TimelineNode({ items }: TimelineNodeType) {
  return (
    <div className="relative" style={{ paddingLeft: '28px' }}>
      {items.length > 1 && (
        <div
          className="absolute"
          style={{
            left: '9px',
            top: '4px',
            bottom: '4px',
            width: '2px',
            backgroundColor: 'var(--beautify-accent)',
            opacity: 0.2,
          }}
        />
      )}

      <ol className="space-y-0">
        {items.map((item, i) => (
          <li key={i} className="relative" style={{ paddingBottom: '24px' }}>
            <span
              className="absolute rounded-full border-2"
              style={{
                left: '-24px',
                top: '2px',
                width: '12px',
                height: '12px',
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--beautify-accent)',
                zIndex: 1,
              }}
            />

            <div className="flex flex-col gap-0.5">
              {item.date && (
                <time className="text-xs font-medium" style={{ color: 'var(--beautify-accent)' }}>
                  {item.date}
                </time>
              )}
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </p>
              {item.description && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
