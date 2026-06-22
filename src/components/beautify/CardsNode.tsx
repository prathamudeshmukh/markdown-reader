import type { CardsNode as CardsNodeType } from '../../ai/beautifyTypes';

const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export default function CardsNode({ columns, cards }: CardsNodeType) {
  return (
    <div className={`grid gap-4 ${GRID_COLS[columns]}`}>
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-xl p-5 flex flex-col gap-2"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {card.icon && <span className="text-2xl">{card.icon}</span>}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {card.title}
            </h3>
            {card.badge && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'color-mix(in srgb, var(--beautify-accent) 15%, transparent)', color: 'var(--beautify-accent)' }}
              >
                {card.badge}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {card.body}
          </p>
        </div>
      ))}
    </div>
  );
}
