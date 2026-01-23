import React, { useLayoutEffect, useRef, useState } from 'react';
import { typeLabels } from '../constants.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function ContextMenu({ contextMenu, options, onAction, containerRef }) {
  if (!contextMenu) return null;

  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: contextMenu.x, top: contextMenu.y });

  useLayoutEffect(() => {
    setPosition({ left: contextMenu.x, top: contextMenu.y });
  }, [contextMenu.x, contextMenu.y]);

  useLayoutEffect(() => {
    const menuEl = menuRef.current;
    const containerEl = containerRef?.current;
    if (!menuEl || !containerEl) return;

    const margin = 12;
    const menuW = menuEl.offsetWidth || 0;
    const menuH = menuEl.offsetHeight || 0;
    const containerW = containerEl.clientWidth || 0;
    const containerH = containerEl.clientHeight || 0;

    const maxLeft = Math.max(margin, containerW - menuW - margin);
    const maxTop = Math.max(margin, containerH - menuH - margin);

    setPosition((pos) => ({
      left: clamp(pos.left, margin, maxLeft),
      top: clamp(pos.top, margin, maxTop),
    }));
  }, [contextMenu.x, contextMenu.y, contextMenu.nodeName, contextMenu.nodeType, contextMenu.mastery, options.length, containerRef]);

  return (
    <div
      className="context-menu"
      ref={menuRef}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        background: 'rgba(13,27,42,0.98)',
        border: '1px solid rgba(255,193,7,0.25)',
        borderRadius: '18px',
        padding: '18px 0',
        width: '540px',
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '18px 27px', borderBottom: '1px solid rgba(255,193,7,0.1)', marginBottom: '8px' }}>
        <div style={{ fontSize: '32px', fontWeight: 600, color: '#FFC107', lineHeight: 1.2, overflowWrap: 'anywhere' }}>
          {contextMenu.nodeName}
        </div>
        <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginTop: '5px', overflowWrap: 'anywhere' }}>
          {typeLabels[contextMenu.nodeType]}
          {contextMenu.mastery !== undefined && (
            <span
              style={{
                marginLeft: '12px',
                color: '#0d1b2a',
                background: '#FFC107',
                padding: '2px 10px',
                borderRadius: '999px',
                fontWeight: 800,
              }}
            >
              {contextMenu.mastery}%
            </span>
          )}
        </div>
      </div>
      {options.map((opt, i) => (
        <div
          key={i}
          onClick={() => onAction(opt.action, contextMenu.nodeId)}
          style={{
            padding: '23px 32px',
            fontSize: '30px',
            color: opt.danger ? '#f44336' : '#E8E8E8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '23px',
            lineHeight: 1.25,
            whiteSpace: 'normal',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = opt.danger ? 'rgba(244,67,54,0.12)' : 'rgba(255,193,7,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ flex: '0 0 auto', color: opt.iconColor || undefined, fontWeight: opt.action === 'toggleChildren' ? 900 : undefined }}>
            {opt.icon}
          </span>
          <span style={{ flex: '1 1 auto', overflowWrap: 'anywhere' }}>{opt.label}</span>
        </div>
      ))}
    </div>
  );
}
