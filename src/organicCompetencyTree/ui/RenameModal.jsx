import { btnCancel, btnSave } from './buttonStyles.js';
import { glassModal, glassInput, fontFamily } from './glassStyles.js';

export default function RenameModal({ isOpen, nodeTypeLabel, value, setValue, onSave, onClose }) {
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
        <h3
          style={{
            margin: '0 0 6px',
            color: '#FFC107',
            fontSize: '22px',
            fontFamily,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          Renombrar Nodo
        </h3>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '12px',
            fontFamily,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {nodeTypeLabel}
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onClose();
          }}
          autoFocus
          style={{
            width: '100%',
            padding: '14px 16px',
            marginBottom: '24px',
            ...glassInput,
            borderRadius: '12px',
            color: '#E8E8E8',
            fontSize: '16px',
            fontFamily,
            fontWeight: 600,
            lineHeight: 1.4,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(255, 193, 7, 0.4)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 193, 7, 0.2)')}
        />
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
