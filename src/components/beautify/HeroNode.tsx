import type { HeroNode as HeroNodeType } from '../../ai/beautifyTypes';

export default function HeroNode({ title, subtitle, badge }: HeroNodeType) {
  return (
    <div className="py-10 px-2 text-center">
      {badge && (
        <span
          className="inline-block mb-3 px-2.5 py-0.5 text-xs font-medium rounded-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--beautify-accent) 15%, transparent)', color: 'var(--beautify-accent)', border: '1px solid color-mix(in srgb, var(--beautify-accent) 30%, transparent)' }}
        >
          {badge}
        </span>
      )}
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
        style={{ color: 'var(--text-primary)', fontFamily: "'DM Serif Display', serif" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
