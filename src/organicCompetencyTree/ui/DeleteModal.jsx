import { btnCancel, btnDelete } from './buttonStyles.js';
import { glassModalDanger, fontFamily } from './glassStyles.js';

export default function DeleteModal({ isOpen, nodeName, onConfirm, onClose }) {
  if (!isOpen) return null;

  const bigBtnCancel = { ...btnCancel, fontSize: '15px', padding: '12px 24px', borderRadius: '12px', fontFamily, fontWeight: 600 };
  const bigBtnDelete = { ...btnDelete, fontSize: '15px', padding: '12px 28px', borderRadius: '12px', fontFamily, fontWeight: 700 };

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
          ...glassModalDanger,
          borderRadius: '20px',
          padding: '28px 32px',
          width: '480px',
          maxWidth: 'calc(100vw - 32px)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px', color: '#f44336', fontSize: '22px', fontFamily, fontWeight: 700, lineHeight: 1.2 }}>
          Confirmar Eliminacion
        </h3>
        <p style={{ margin: '0 0 10px', color: '#E8E8E8', fontSize: '16px', fontFamily, fontWeight: 500, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
          ¿Eliminar <strong style={{ color: '#FFC107', fontWeight: 700 }}>"{nodeName}"</strong>?
        </p>
        <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily, fontWeight: 500, lineHeight: 1.4 }}>
          Tambien se eliminaran todos sus nodos hijos.
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
