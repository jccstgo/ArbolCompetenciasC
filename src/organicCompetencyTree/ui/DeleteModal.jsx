import { btnCancel, btnDelete } from './buttonStyles.js';

export default function DeleteModal({ isOpen, nodeName, onConfirm, onClose }) {
  if (!isOpen) return null;

  const bigBtnCancel = { ...btnCancel, fontSize: '27px', padding: '12px 22px', borderRadius: '12px' };
  const bigBtnDelete = { ...btnDelete, fontSize: '27px', padding: '12px 26px', borderRadius: '12px' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1b263b 0%, #0d1b2a 100%)',
          border: '1px solid rgba(244,67,54,0.25)',
          borderRadius: '22px',
          padding: '32px 34px',
          width: '720px',
          maxWidth: 'calc(100vw - 24px)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px', color: '#f44336', fontSize: '36px', fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
          Confirmar Eliminación
        </h3>
        <p style={{ margin: '0 0 10px', color: '#E8E8E8', fontSize: '27px', lineHeight: 1.25, overflowWrap: 'anywhere' }}>
          ¿Eliminar <strong style={{ color: '#FFC107', fontWeight: 800 }}>"{nodeName}"</strong>?
        </p>
        <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.6)', fontSize: '24px', lineHeight: 1.25 }}>
          También se eliminarán todos sus nodos hijos.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={bigBtnCancel}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={bigBtnDelete}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
