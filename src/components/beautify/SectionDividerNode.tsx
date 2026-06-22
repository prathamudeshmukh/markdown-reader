import type { SectionDividerNode as SectionDividerNodeType } from '../../ai/beautifyTypes';

export default function SectionDividerNode({ label }: SectionDividerNodeType) {
  if (!label) {
    return <hr style={{ borderColor: 'var(--border)', margin: '0.5rem 0' }} />;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      <span
        className="text-xs font-semibold uppercase tracking-widest px-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
    </div>
  );
}
