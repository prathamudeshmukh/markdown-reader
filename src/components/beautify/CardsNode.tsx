import type { CardsNode as CardsNodeType } from '../../ai/beautifyTypes';

export default function CardsNode({ columns, cards }: CardsNodeType) {
  return (
    <div className={`grid gap-4 grid-cols-${columns}`}>
      {cards.map((card, i) => (
        <div key={i} className="rounded-xl p-5 space-y-2" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          {card.icon && <span className="text-2xl">{card.icon}</span>}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
            {card.badge && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--beautify-accent)', color: '#fff' }}>{card.badge}</span>}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
        </div>
      ))}
    </div>
  );
}
