import type { SectionDividerNode as SectionDividerNodeType } from '../../ai/beautifyTypes';

export default function SectionDividerNode({ label }: SectionDividerNodeType) {
  if (!label) {
    return <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />;
  }
  return (
    <div className="flex items-center gap-4">
      <hr className="flex-1" style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <hr className="flex-1" style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
    </div>
  );
}
