const legendItems = [
  { type: 'trunk', label: 'Copa – Identidad', color: '#4CAF50', icon: '🌳' },
  { type: 'root', label: 'Raíz – Fundamento', color: '#8D6E63', icon: '◆' },
  { type: 'branch', label: 'Rama – Especialización', color: '#81C784', icon: '🌿' },
  { type: 'fruit', label: 'Fruto – Competencia', color: '#EF5350', icon: '🍎' },
];

export default function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
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
        Leyenda
      </div>
      {legendItems.map((item) => (
        <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              background: item.color,
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(0,0,0,0.25)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.18)',
            }}
          >
            <span style={{ fontSize: '20px', color: '#fff', textShadow: '0 2px 0 rgba(0,0,0,0.45)' }}>{item.icon}</span>
          </div>
          <span style={{ fontSize: 'clamp(28px, 2.1vw, 36px)', fontWeight: 800, color: '#E8E8E8', lineHeight: 1.2 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
