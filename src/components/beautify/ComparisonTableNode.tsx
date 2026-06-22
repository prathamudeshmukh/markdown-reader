import type { ComparisonTableNode as ComparisonTableNodeType } from '../../ai/beautifyTypes';

export default function ComparisonTableNode({ columns, rows }: ComparisonTableNodeType) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              Feature
            </th>
            {columns.map((col) => (
              <th key={col} className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--beautify-accent)', borderBottom: '1px solid var(--border)' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                {row.feature}
              </td>
              {row.values.map((val, j) => (
                <td key={j} className="px-4 py-3 text-center text-xs" style={{ color: val === '✓' ? '#16a34a' : val === '✗' ? '#dc2626' : 'var(--text-secondary)' }}>
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
