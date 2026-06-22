import type { CalloutNode as CalloutNodeType } from '../../ai/beautifyTypes';

const VARIANT_STYLES = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: 'ℹ' },
  tip:     { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '💡' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: '⚠' },
  danger:  { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: '🚫' },
};

const VARIANT_STYLES_DARK = {
  info:    { bg: '#1e3a5f', border: '#1e40af', text: '#93c5fd' },
  tip:     { bg: '#14532d', border: '#166534', text: '#86efac' },
  warning: { bg: '#78350f', border: '#92400e', text: '#fcd34d' },
  danger:  { bg: '#7f1d1d', border: '#991b1b', text: '#fca5a5' },
};

export default function CalloutNode({ variant, title, body }: CalloutNodeType) {
  const s = VARIANT_STYLES[variant];
  const d = VARIANT_STYLES_DARK[variant];
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      <style>{`@media (prefers-color-scheme: dark) { .callout-${variant} { background-color: ${d.bg} !important; border-color: ${d.border} !important; } .callout-${variant} .callout-text { color: ${d.text} !important; } }`}</style>
      <div className={`callout-${variant} flex items-start gap-2.5`}>
        <span className="text-base shrink-0 mt-0.5">{s.icon}</span>
        <div>
          {title && (
            <p className={`callout-text text-sm font-semibold mb-1`} style={{ color: s.text }}>
              {title}
            </p>
          )}
          <p className={`callout-text text-sm`} style={{ color: s.text }}>
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
