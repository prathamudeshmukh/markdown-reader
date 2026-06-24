import type { ProseNode as ProseNodeType } from '../../ai/beautifyTypes';

export default function ProseNode({ markdown }: ProseNodeType) {
  return (
    <div className="prose max-w-none" style={{ color: 'var(--text-primary)' }}>
      {markdown}
    </div>
  );
}
