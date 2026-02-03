import { useMemo } from 'react';
import { glassPanel, fontFamily } from './glassStyles.js';

const statItems = [
  { label: 'Raices', type: 'root', color: '#8D6E63' },
  { label: 'Ramas', type: 'branch', color: '#81C784' },
  { label: 'Frutos', type: 'fruit', color: '#EF5350' },
];

export default function Stats({ treeData }) {
  const counts = useMemo(() => {
    const totals = { root: 0, branch: 0, fruit: 0 };
    const stack = [treeData];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (node.type && Object.prototype.hasOwnProperty.call(totals, node.type)) {
        totals[node.type] += 1;
      }
      const children = Array.isArray(node.children) ? node.children : [];
      const hidden = Array.isArray(node._children) ? node._children : [];
      for (const child of children) stack.push(child);
      for (const child of hidden) stack.push(child);
    }
    return totals;
  }, [treeData]);

  return (
    <div
      className="stats-panel"
      style={{
        position: 'absolute',
        bottom: 14,
        right: 14,
        zIndex: 10,
        pointerEvents: 'none',
        padding: '14px 16px',
        ...glassPanel,
        borderRadius: '14px',
      }}
    >
      <div
        className="stats-title"
        style={{
          fontSize: '11px',
          fontFamily,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '1.5px',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}
      >
        Estadisticas
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        {statItems.map((item) => (
          <div key={item.type} style={{ textAlign: 'center' }}>
            <div
              className="stats-number"
              style={{
                fontSize: '24px',
                fontFamily,
                fontWeight: 800,
                color: item.color,
                lineHeight: 1.05,
                textShadow: `0 2px 8px ${item.color}40`,
              }}
            >
              {counts[item.type] ?? 0}
            </div>
            <div
              className="stats-label"
              style={{
                fontSize: '11px',
                fontFamily,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginTop: '2px',
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
