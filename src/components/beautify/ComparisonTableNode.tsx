import type { ComparisonTableNode as ComparisonTableNodeType } from '../../ai/beautifyTypes';

export default function ComparisonTableNode({ columns, rows }: ComparisonTableNodeType) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-primary)' }}>Feature</th>
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-primary)' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
              <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.feature}</td>
              {row.values.map((val, j) => (
                <td key={j} className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
