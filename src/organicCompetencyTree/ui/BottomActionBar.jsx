import React, { useState } from 'react';
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
  const panelWidth = Number.isFinite(widthPx) ? Math.min(340, Math.max(240, widthPx)) : 300;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="bottom-action-bar"
      style={{
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 11,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Toggle button (always visible) */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        style={{
          pointerEvents: 'auto',
          width: 40,
          height: 40,
          borderRadius: 12,
          border: '1px solid rgba(255,193,7,0.75)',
          background: collapsed
            ? 'linear-gradient(180deg, rgba(255,193,7,0.95), rgba(255,193,7,0.6))'
            : 'linear-gradient(180deg, rgba(255,193,7,0.85), rgba(255,193,7,0.5))',
          color: '#0d1b2a',
          fontSize: 18,
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 18px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,193,7,0.18)',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
      >
        {collapsed ? '⟨' : '⟩'}
      </button>

      {!collapsed && (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: panelWidth,
            maxWidth: 'min(320px, 88vw)',
            padding: '12px 14px',
            ...glassPanel,
            borderRadius: 16,
            fontFamily,
            maxHeight: '70vh',
            overflow: 'auto',
          }}
        >
          {/* Info del nodo seleccionado */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 8,
              width: '100%',
            }}
          >
            {selectedNode ? (
              <>
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: nodeColor,
                    boxShadow: `0 0 10px ${nodeColor}80`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 10,
                    fontFamily,
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
                    fontSize: 12,
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
                  fontSize: 11,
                  fontFamily,
                  fontWeight: 500,
                  fontStyle: 'italic',
                }}
              >
                Selecciona un nodo para ver acciones
              </span>
            )}
          </div>

          {selectedNode && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, width: '100%' }}>
              <button
                type="button"
                onClick={() => onToggleSapFlow?.()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: sapFlowEnabled
                    ? 'linear-gradient(180deg, rgba(255,193,7,0.22), rgba(255,193,7,0.06))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
                  color: 'rgba(255,255,255,0.92)',
                  fontFamily,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: '100%',
                  justifyContent: 'space-between',
                }}
                title="Activa/desactiva el flujo de savia en las dependencias seleccionadas"
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 7,
                    background: sapFlowEnabled ? 'rgba(255,193,7,0.18)' : 'rgba(255,255,255,0.08)',
                    color: sapFlowEnabled ? '#FFD54F' : 'rgba(255,255,255,0.55)',
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  💧
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>Flujo de savia</span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: sapFlowEnabled ? 'rgba(76,175,80,0.18)' : 'rgba(176,190,197,0.14)',
                    border: sapFlowEnabled ? '1px solid rgba(76,175,80,0.25)' : '1px solid rgba(176,190,197,0.18)',
                    color: sapFlowEnabled ? '#A5D6A7' : 'rgba(255,255,255,0.6)',
                    fontWeight: 900,
                    fontSize: 11,
                    letterSpacing: '0.4px',
                  }}
                >
                  {sapFlowEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          )}

          {/* Acciones */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
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
                  className="action-btn"
                  onClick={() => selectedNode && onAction(opt.action, selectedNode.id)}
                  disabled={!selectedNode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 8,
                    padding: '10px 12px',
                    minHeight: 42,
                    width: '100%',
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
                    fontSize: 12,
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
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
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
                      width: 22,
                      height: 22,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      background: danger ? 'rgba(255,82,82,0.15)' : 'rgba(255,193,7,0.12)',
                      color: iconColor,
                      fontSize: 14,
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
      )}
    </div>
  );
}
