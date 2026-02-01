import React from 'react';
import { typeLabels } from '../constants.js';
import { glassPanel, fontFamily } from './glassStyles.js';

const nodeTypeColors = {
  trunk: '#4CAF50',
  root: '#8D6E63',
  branch: '#81C784',
  fruit: '#EF5350',
};

export default function BottomActionBar({ selectedNode, options, onAction, sapFlowEnabled, onToggleSapFlow, widthPx }) {
  const nodeType = selectedNode?.type;
  const nodeColor = nodeTypeColors[nodeType] || '#FFC107';
  const barWidth = Number.isFinite(widthPx) ? widthPx : undefined;

  return (
    <div
      className="bottom-action-bar"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 14,
        transform: 'translateX(-50%)',
        zIndex: 11,
        // Allow the diagram to stay draggable even if it's visible behind this bar.
        // We re-enable pointer events only on the actual buttons below.
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        width: barWidth || 'min(820px, calc(100vw - 420px))',
        maxWidth: barWidth || 'calc(100vw - 32px)',
        padding: '14px 18px 16px',
        ...glassPanel,
        borderRadius: 16,
        fontFamily,
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
                fontSize: 11,
                fontFamily,
                fontWeight: 600,
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
                fontFamily,
                fontWeight: 600,
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
              fontFamily,
              fontWeight: 500,
              fontStyle: 'italic',
            }}
          >
            Selecciona un nodo para ver acciones
          </span>
        )}
      </div>

      {/* Controles globales */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, width: '100%', pointerEvents: 'auto' }}>
        <button
          type="button"
          onClick={() => onToggleSapFlow?.()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: sapFlowEnabled
              ? 'linear-gradient(180deg, rgba(255,193,7,0.22), rgba(255,193,7,0.06))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
            color: 'rgba(255,255,255,0.92)',
            fontFamily,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          title="Activa/desactiva el flujo de savia en las dependencias seleccionadas"
        >
          <span
            style={{
              width: 26,
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              background: sapFlowEnabled ? 'rgba(255,193,7,0.18)' : 'rgba(255,255,255,0.08)',
              color: sapFlowEnabled ? '#FFD54F' : 'rgba(255,255,255,0.55)',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            💧
          </span>
          <span>Flujo de savia</span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: sapFlowEnabled ? 'rgba(76,175,80,0.18)' : 'rgba(176,190,197,0.14)',
              border: sapFlowEnabled ? '1px solid rgba(76,175,80,0.25)' : '1px solid rgba(176,190,197,0.18)',
              color: sapFlowEnabled ? '#A5D6A7' : 'rgba(255,255,255,0.6)',
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: '0.4px',
            }}
          >
            {sapFlowEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Barra de acciones - botones grandes para tablet */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          pointerEvents: 'auto',
        }}
      >
        {(options || []).map((opt) => {
          const danger = !!opt.danger;
          const iconColor = opt.iconColor || (danger ? '#FF5252' : '#FFC107');

          return (
            <button
              key={opt.action}
              className="action-btn"
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
                fontFamily,
                fontWeight: 600,
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
                className="action-icon"
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
