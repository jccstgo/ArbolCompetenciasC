const statItems = [
  { label: 'Raíces', type: 'root', color: '#8D6E63' },
  { label: 'Ramas', type: 'branch', color: '#81C784' },
  { label: 'Frutos', type: 'fruit', color: '#EF5350' },
];

export default function Stats({ treeData, countNodes }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        right: 14,
        zIndex: 10,
        padding: '24px 26px',
        background: 'rgba(13,27,42,0.9)',
        borderRadius: '18px',
        border: '1px solid rgba(255,193,7,0.15)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          fontSize: 'clamp(24px, 1.9vw, 32px)',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '1.5px',
          marginBottom: '16px',
          textTransform: 'uppercase',
        }}
      >
        Estadísticas
      </div>
      <div style={{ display: 'flex', gap: '28px' }}>
        {statItems.map((item) => (
          <div key={item.type} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(48px, 3.6vw, 68px)', fontWeight: 900, color: item.color, lineHeight: 1.05 }}>
              {countNodes(treeData, item.type)}
            </div>
            <div style={{ fontSize: 'clamp(24px, 1.9vw, 32px)', fontWeight: 900, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
