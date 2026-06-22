import type { StatsNode as StatsNodeType } from '../../ai/beautifyTypes';

const TREND_ICONS = {
  up:      { symbol: '↑', color: '#16a34a' },
  down:    { symbol: '↓', color: '#dc2626' },
  neutral: { symbol: '→', color: 'var(--text-muted)' },
};

export default function StatsNode({ items }: StatsNodeType) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl p-5 flex flex-col gap-1 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-center gap-1">
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--beautify-accent)' }}
            >
              {item.value}
            </span>
            {item.trend && (
              <span
                className="text-sm font-semibold"
                style={{ color: TREND_ICONS[item.trend].color }}
              >
                {TREND_ICONS[item.trend].symbol}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
