import { btnCancel, btnSave } from './buttonStyles.js';

export default function RenameModal({ isOpen, nodeTypeLabel, value, setValue, onSave, onClose }) {
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
          Renombrar Nodo
        </h3>
        <p
          style={{
            margin: '0 0 18px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
            overflowWrap: 'anywhere',
            letterSpacing: '0.5px',
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
            marginBottom: '22px',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,193,7,0.25)',
            borderRadius: '12px',
            color: '#E8E8E8',
            fontSize: '30px',
            fontWeight: 800,
            lineHeight: 1.2,
            outline: 'none',
            boxSizing: 'border-box',
          }}
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
