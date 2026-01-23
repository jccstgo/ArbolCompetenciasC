import React from 'react';
import { typeLabels } from '../constants.js';

const nodeTypeColors = {
  trunk: '#4CAF50',
  root: '#8D6E63',
  branch: '#81C784',
  fruit: '#EF5350',
};

export default function BottomActionBar({ selectedNode, options, onAction, onReorganize }) {
  const nodeType = selectedNode?.type;
  const nodeColor = nodeTypeColors[nodeType] || '#FFC107';

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 14,
        transform: 'translateX(-50%)',
        zIndex: 11,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        width: 'min(720px, calc(100vw - 480px))',
        maxWidth: 'calc(100vw - 32px)',
        padding: '10px 14px',
        background: 'rgba(13,27,42,0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,193,7,0.12)',
        borderRadius: 14,
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header con nodo seleccionado y botón reorganizar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 12,
        }}
      >
        {/* Info del nodo seleccionado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          {selectedNode ? (
            <>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: nodeColor,
                  boxShadow: `0 0 8px ${nodeColor}60`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}
              >
                {typeLabels[nodeType] || 'Nodo'}:
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 12,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={selectedNode.name}
              >
                {selectedNode.name || ''}
              </span>
            </>
          ) : (
            <span
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                fontWeight: 600,
                fontStyle: 'italic',
              }}
            >
              Selecciona un nodo para ver acciones
            </span>
          )}
        </div>

        {/* Botón reorganizar */}
        <button
          onClick={onReorganize}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,193,7,0.25)',
            background: 'linear-gradient(180deg, rgba(255,193,7,0.15), rgba(255,193,7,0.05))',
            color: '#FFC107',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,193,7,0.25), rgba(255,193,7,0.12))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,193,7,0.15), rgba(255,193,7,0.05))';
          }}
        >
          Reorganizar
        </button>
      </div>

      {/* Barra de acciones */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
        }}
      >
        {(options || []).map((opt) => {
          const danger = !!opt.danger;
          const iconColor = opt.iconColor || (danger ? '#FF5252' : '#FFC107');

          return (
            <button
              key={opt.action}
              onClick={() => selectedNode && onAction(opt.action, selectedNode.id)}
              disabled={!selectedNode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 8,
                border: danger
                  ? '1px solid rgba(255,82,82,0.25)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: danger
                  ? 'linear-gradient(180deg, rgba(255,82,82,0.15), rgba(255,82,82,0.05))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                color: danger ? '#FF8A80' : 'rgba(255,255,255,0.85)',
                fontWeight: 700,
                fontSize: 11,
                cursor: selectedNode ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                opacity: selectedNode ? 1 : 0.4,
              }}
              onMouseEnter={(e) => {
                if (selectedNode) {
                  e.currentTarget.style.background = danger
                    ? 'linear-gradient(180deg, rgba(255,82,82,0.25), rgba(255,82,82,0.12))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.06))';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = danger
                  ? 'linear-gradient(180deg, rgba(255,82,82,0.15), rgba(255,82,82,0.05))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  background: danger ? 'rgba(255,82,82,0.12)' : 'rgba(255,193,7,0.10)',
                  color: iconColor,
                  fontSize: 13,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {opt.icon}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
