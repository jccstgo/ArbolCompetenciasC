import { typeIcons } from '../constants.js';
import { glassPanel, fontFamily } from './glassStyles.js';

const legendItems = [
  { type: 'trunk', label: 'Copa – Identidad', color: '#4CAF50', icon: typeIcons.trunk },
  { type: 'root', label: 'Raiz – Fundamento', color: '#8D6E63', icon: typeIcons.root },
  { type: 'branch', label: 'Rama – Especializacion', color: '#81C784', icon: typeIcons.branch },
  { type: 'fruit', label: 'Fruto – Competencia', color: '#EF5350', icon: typeIcons.fruit },
];

export default function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        zIndex: 10,
        padding: '14px 16px',
        ...glassPanel,
        borderRadius: '14px',
      }}
    >
      <div
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
        Leyenda
      </div>
      {legendItems.map((item) => (
        <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)`,
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: `0 4px 12px ${item.color}40`,
            }}
          >
            <span style={{ fontSize: '11px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{item.icon}</span>
          </div>
          <span style={{ fontSize: '13px', fontFamily, fontWeight: 600, color: '#E8E8E8', lineHeight: 1.2 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
