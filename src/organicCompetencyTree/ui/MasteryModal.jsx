import { btnCancel, btnSave } from './buttonStyles.js';

export default function MasteryModal({ isOpen, nodeName, value, setValue, getMasteryLevel, onSave, onClose }) {
  if (!isOpen) return null;

  const bigBtnCancel = { ...btnCancel, fontSize: '27px', padding: '12px 22px', borderRadius: '12px' };
  const bigBtnSave = { ...btnSave, fontSize: '27px', padding: '12px 26px', borderRadius: '12px' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1b263b 0%, #0d1b2a 100%)',
          border: '1px solid rgba(255,193,7,0.25)',
          borderRadius: '22px',
          padding: '32px 34px',
          width: '720px',
          maxWidth: 'calc(100vw - 24px)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px', color: '#FFC107', fontSize: '36px', fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
          Editar Dominio
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '27px', color: '#E8E8E8', overflowWrap: 'anywhere', lineHeight: 1.3 }}>
          {nodeName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value))}
            style={{
              flex: 1,
              height: '10px',
              borderRadius: '6px',
              background: `linear-gradient(to right, #FFC107 0%, #FFC107 ${value}%, #333 ${value}%, #333 100%)`,
              cursor: 'pointer',
              WebkitAppearance: 'none',
            }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
            style={{
              width: '84px',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,193,7,0.25)',
              borderRadius: '12px',
              color: '#FFC107',
              fontSize: '33px',
              fontWeight: 'bold',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ color: '#FFC107', fontWeight: 'bold', fontSize: '33px' }}>%</span>
        </div>
        <div style={{ padding: '12px', background: 'rgba(255,193,7,0.08)', borderRadius: '12px', textAlign: 'center', marginBottom: '22px' }}>
          <span style={{ fontSize: '27px', color: getMasteryLevel(value).color, fontWeight: 800 }}>{getMasteryLevel(value).text}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={bigBtnCancel}>
            Cancelar
          </button>
          <button onClick={onSave} style={bigBtnSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
