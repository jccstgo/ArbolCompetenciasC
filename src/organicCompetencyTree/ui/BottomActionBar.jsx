import React from 'react';
import { typeLabels } from '../constants.js';

const nodeTypeColors = {
  trunk: '#4CAF50',
  root: '#8D6E63',
  branch: '#81C784',
  fruit: '#EF5350',
};

export default function BottomActionBar({ selectedNode, options, onAction }) {
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
        gap: 10,
        width: 'min(800px, calc(100vw - 420px))',
        maxWidth: 'calc(100vw - 32px)',
        padding: '12px 16px 14px',
        background: 'rgba(13,27,42,0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,193,7,0.12)',
        borderRadius: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Info del nodo seleccionado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        {selectedNode ? (
          <>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: nodeColor,
                boxShadow: `0 0 10px ${nodeColor}80`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
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
                color: 'rgba(255,255,255,0.95)',
                fontSize: 13,
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
              fontSize: 12,
              fontWeight: 600,
              fontStyle: 'italic',
            }}
          >
            Selecciona un nodo para ver acciones
          </span>
        )}
      </div>

      {/* Barra de acciones - botones grandes para tablet */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
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
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                minHeight: 48,
                minWidth: 100,
                flex: '1 1 auto',
                maxWidth: 180,
                borderRadius: 12,
                border: danger
                  ? '1px solid rgba(255,82,82,0.30)'
                  : '1px solid rgba(255,255,255,0.10)',
                background: danger
                  ? 'linear-gradient(180deg, rgba(255,82,82,0.18), rgba(255,82,82,0.06))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
                color: danger ? '#FF8A80' : 'rgba(255,255,255,0.9)',
                fontWeight: 700,
                fontSize: 13,
                cursor: selectedNode ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                opacity: selectedNode ? 1 : 0.4,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedNode) {
                  e.currentTarget.style.background = danger
                    ? 'linear-gradient(180deg, rgba(255,82,82,0.28), rgba(255,82,82,0.14))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = danger
                  ? 'linear-gradient(180deg, rgba(255,82,82,0.18), rgba(255,82,82,0.06))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  background: danger ? 'rgba(255,82,82,0.15)' : 'rgba(255,193,7,0.12)',
                  color: iconColor,
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1,
                  flexShrink: 0,
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
