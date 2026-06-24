import type { CalloutNode as CalloutNodeType } from '../../ai/beautifyTypes';

const VARIANT_STYLES: Record<CalloutNodeType['variant'], { bg: string; border: string; color: string }> = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
  tip:     { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
  danger:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
};

export default function CalloutNode({ variant, title, body }: CalloutNodeType) {
  const s = VARIANT_STYLES[variant];
  return (
    <div className="rounded-xl px-5 py-4 space-y-1" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {title && <p className="font-semibold">{title}</p>}
      <p className="text-sm">{body}</p>
    </div>
  );
}
