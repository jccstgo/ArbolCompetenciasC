import React, { useState, useMemo, useRef, useEffect } from 'react';
import { typeLabels } from '../constants.js';

const nodeTypeColors = {
  trunk: '#4CAF50',
  root: '#8D6E63',
  branch: '#81C784',
  fruit: '#EF5350',
};

function flattenTree(node, results = []) {
  if (!node) return results;
  results.push({ id: node.id, name: node.name, type: node.type, mastery: node.mastery });
  const children = node.children || [];
  const hiddenChildren = node._children || [];
  [...children, ...hiddenChildren].forEach((child) => flattenTree(child, results));
  return results;
}

export default function SearchBar({ treeData, onSelectNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const allNodes = useMemo(() => flattenTree(treeData), [treeData]);

  const filteredNodes = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return allNodes.filter(
      (node) =>
        node.name?.toLowerCase().includes(lowerQuery) ||
        typeLabels[node.type]?.toLowerCase().includes(lowerQuery)
    );
  }, [allNodes, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filteredNodes.length]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current && filteredNodes.length > 0) {
      const highlighted = listRef.current.children[highlightIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, filteredNodes.length]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSelect = (node) => {
    onSelectNode(node.id);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filteredNodes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredNodes[highlightIndex]) {
      handleSelect(filteredNodes[highlightIndex]);
    }
  };

  const glassStyle = {
    background: 'rgba(13, 27, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 193, 7, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 12,
          ...glassStyle,
          color: 'rgba(255,255,255,0.8)',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(13, 27, 42, 0.85)';
          e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(13, 27, 42, 0.75)';
          e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.15)';
        }}
      >
        <span style={{ fontSize: 16 }}>🔍</span>
        <span>Buscar</span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.1)',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Ctrl+K
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 2000,
      }}
      onClick={() => {
        setIsOpen(false);
        setQuery('');
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 16px',
          borderRadius: 16,
          overflow: 'hidden',
          ...glassStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input de busqueda */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, opacity: 0.6 }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar competencia, rama, raiz..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#E8E8E8',
                fontSize: 18,
                fontWeight: 500,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              ESC
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div
          ref={listRef}
          style={{
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {query.trim() && filteredNodes.length === 0 && (
            <div
              style={{
                padding: '24px 20px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              No se encontraron resultados para "{query}"
            </div>
          )}

          {filteredNodes.map((node, index) => {
            const color = nodeTypeColors[node.type] || '#FFC107';
            const isHighlighted = index === highlightIndex;

            return (
              <div
                key={node.id}
                onClick={() => handleSelect(node)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  cursor: 'pointer',
                  background: isHighlighted ? 'rgba(255, 193, 7, 0.12)' : 'transparent',
                  borderLeft: isHighlighted ? '3px solid #FFC107' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${color}22`,
                    border: `2px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#E8E8E8',
                      fontSize: 15,
                      fontWeight: 600,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {node.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {typeLabels[node.type] || node.type}
                    </span>
                    {node.mastery !== undefined && (
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(255, 193, 7, 0.15)',
                          color: '#FFC107',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                      >
                        {node.mastery}%
                      </span>
                    )}
                  </div>
                </div>

                {isHighlighted && (
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 11,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    Enter ↵
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer con ayuda */}
        {query.trim() && filteredNodes.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontWeight: 600 }}>↑</kbd>
              <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontWeight: 600 }}>↓</kbd>
              navegar
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontWeight: 600 }}>Enter</kbd>
              seleccionar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
