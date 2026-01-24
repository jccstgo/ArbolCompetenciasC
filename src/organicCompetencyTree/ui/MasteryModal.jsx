import { btnCancel, btnSave } from './buttonStyles.js';
import { glassModal, glassInput, fontFamily } from './glassStyles.js';

export default function MasteryModal({ isOpen, nodeName, value, setValue, getMasteryLevel, onSave, onClose }) {
  if (!isOpen) return null;

  const bigBtnCancel = { ...btnCancel, fontSize: '15px', padding: '12px 24px', borderRadius: '12px', fontFamily, fontWeight: 600 };
  const bigBtnSave = { ...btnSave, fontSize: '15px', padding: '12px 28px', borderRadius: '12px', fontFamily, fontWeight: 700 };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...glassModal,
          borderRadius: '20px',
          padding: '28px 32px',
          width: '480px',
          maxWidth: 'calc(100vw - 32px)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px', color: '#FFC107', fontSize: '22px', fontFamily, fontWeight: 700, lineHeight: 1.2 }}>
          Editar Dominio
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '16px', fontFamily, fontWeight: 600, color: '#E8E8E8', overflowWrap: 'anywhere', lineHeight: 1.3 }}>
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
              height: '8px',
              borderRadius: '6px',
              background: `linear-gradient(to right, #FFC107 0%, #FFC107 ${value}%, rgba(255,255,255,0.15) ${value}%, rgba(255,255,255,0.15) 100%)`,
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
              width: '72px',
              padding: '10px 12px',
              ...glassInput,
              borderRadius: '12px',
              color: '#FFC107',
              fontSize: '20px',
              fontFamily,
              fontWeight: 700,
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ color: '#FFC107', fontFamily, fontWeight: 700, fontSize: '20px' }}>%</span>
        </div>
        <div
          style={{
            padding: '14px',
            background: 'rgba(255, 193, 7, 0.08)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px',
            border: '1px solid rgba(255, 193, 7, 0.1)',
          }}
        >
          <span style={{ fontSize: '16px', fontFamily, color: getMasteryLevel(value).color, fontWeight: 700 }}>
            {getMasteryLevel(value).text}
          </span>
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
