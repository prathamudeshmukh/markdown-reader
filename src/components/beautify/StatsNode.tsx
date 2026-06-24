import type { StatsNode as StatsNodeType } from '../../ai/beautifyTypes';

const TREND_ICONS = { up: '↑', down: '↓', neutral: '→' } as const;

export default function StatsNode({ items }: StatsNodeType) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-5 text-center space-y-1" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--beautify-accent)' }}>
            {item.value}
            {item.trend && <span className="text-base ml-1">{TREND_ICONS[item.trend]}</span>}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}
