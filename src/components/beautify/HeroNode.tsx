import type { HeroNode as HeroNodeType } from '../../ai/beautifyTypes';

export default function HeroNode({ title, subtitle, badge }: HeroNodeType) {
  return (
    <div className="text-center py-10 space-y-3">
      {badge && (
        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: 'var(--beautify-accent)', color: '#fff' }}>
          {badge}
        </span>
      )}
      <h1 className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
      {subtitle && <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  );
}
