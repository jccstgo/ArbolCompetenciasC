import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { glassPanel, fontFamily } from './glassStyles.js';

const STORAGE_KEY = 'arbol-competencias-data';

export default function ToolbarMenu({
  treeData,
  onImport,
  onExportImage,
  svgRef,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const buildTreeSnapshot = () => {
    const snapshot = JSON.parse(JSON.stringify(treeData));

    if (!svgRef?.current) return snapshot;

    const posById = new Map();
    d3.select(svgRef.current)
      .selectAll('.nodes .node')
      .each(function (d) {
        const id = d?.data?.id;
        if (id == null) return;
        if (Number.isFinite(d.fx) && Number.isFinite(d.fy)) {
          posById.set(id, { x: d.fx, y: d.fy });
        }
      });

    const applyPos = (node) => {
      if (!node) return;
      const pos = posById.get(node.id);
      if (pos) node.pos = pos;
      if (Array.isArray(node.children)) node.children.forEach(applyPos);
      if (Array.isArray(node._children)) node._children.forEach(applyPos);
    };

    applyPos(snapshot);
    return snapshot;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export tree data as JSON file
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(buildTreeSnapshot(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arbol-competencias-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  // Import tree data from JSON file
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData && importedData.id !== undefined && importedData.name) {
          onImport(importedData);
          setShowImportModal(false);
          setIsOpen(false);
        } else {
          alert('El archivo no tiene un formato valido de arbol de competencias.');
        }
      } catch {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export as PNG image
  const handleExportImage = async () => {
    if (!svgRef?.current) return;

    setIsOpen(false);

    // Give time for menu to close
    setTimeout(async () => {
      try {
        const svgElement = svgRef.current;
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = 2; // Higher resolution
          canvas.width = svgElement.clientWidth * scale;
          canvas.height = svgElement.clientHeight * scale;

          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.fillStyle = '#0d1b2a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `arbol-competencias-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(svgUrl);
          }, 'image/png');
        };
        img.src = svgUrl;
      } catch (err) {
        console.error('Error exporting image:', err);
        alert('Error al exportar la imagen.');
      }
    }, 100);
  };

  // Save to localStorage
  const handleSaveLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildTreeSnapshot()));
      setIsOpen(false);
      // Show brief success feedback
      const btn = document.querySelector('.save-local-btn');
      if (btn) {
        btn.textContent = 'Guardado!';
        setTimeout(() => {
          btn.textContent = 'Guardar Local';
        }, 1500);
      }
    } catch {
      alert('Error al guardar en el almacenamiento local.');
    }
  };

  // Generate shareable URL
  const handleShare = () => {
    try {
      const compressedData = btoa(encodeURIComponent(JSON.stringify(buildTreeSnapshot())));
      const url = `${window.location.origin}${window.location.pathname}?tree=${compressedData}`;
      setShareUrl(url);
      setShowShareModal(true);
      setIsOpen(false);
    } catch {
      alert('Error al generar el enlace para compartir.');
    }
  };

  // Copy share URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const menuButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  };

  const glassModalStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  };

  const modalContentStyle = {
    ...glassPanel,
    borderRadius: 20,
    padding: '28px 32px',
    width: 520,
    maxWidth: 'calc(100vw - 32px)',
    boxSizing: 'border-box',
  };

  return (
    <>
      <div ref={menuRef} style={{ position: 'absolute', top: 14, left: 14, zIndex: 12 }}>
        {/* Menu Button */}
        <button
          className="toolbar-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 12,
            ...glassPanel,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily,
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
          <span style={{ fontSize: 18 }}>☰</span>
          <span>Menu</span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="toolbar-dropdown"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              minWidth: 220,
              ...glassPanel,
              borderRadius: 14,
              padding: '8px',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <button
              onClick={handleSaveLocal}
              className="save-local-btn"
              style={menuButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,193,7,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16, width: 24 }}>💾</span>
              Guardar Local
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />

            <button
              onClick={handleExportJSON}
              style={menuButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,193,7,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16, width: 24 }}>📄</span>
              Exportar JSON
            </button>

            <button
              onClick={() => { setShowImportModal(true); setIsOpen(false); }}
              style={menuButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,193,7,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16, width: 24 }}>📂</span>
              Importar JSON
            </button>

            <button
              onClick={handleExportImage}
              style={menuButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,193,7,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16, width: 24 }}>🖼️</span>
              Exportar Imagen
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />

            <button
              onClick={handleShare}
              style={menuButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,193,7,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16, width: 24 }}>🔗</span>
              Compartir
            </button>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={glassModalStyle} onClick={() => setShowImportModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', color: '#FFC107', fontSize: 22, fontFamily, fontWeight: 700 }}>
              Importar Arbol
            </h3>
            <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily }}>
              Selecciona un archivo JSON previamente exportado.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              style={{ display: 'none' }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '40px 20px',
                border: '2px dashed rgba(255,193,7,0.3)',
                borderRadius: 12,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 20,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,193,7,0.6)';
                e.currentTarget.style.background = 'rgba(255,193,7,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,193,7,0.3)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily, fontWeight: 500 }}>
                Click para seleccionar archivo
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily, marginTop: 4 }}>
                o arrastra un archivo .json aqui
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  fontFamily,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={glassModalStyle} onClick={() => setShowShareModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', color: '#FFC107', fontSize: 22, fontFamily, fontWeight: 700 }}>
              Compartir Arbol
            </h3>
            <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily }}>
              Copia este enlace para compartir tu arbol de competencias.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,193,7,0.2)',
                  color: '#E8E8E8',
                  fontSize: 13,
                  fontFamily,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCopyUrl}
                style={{
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: copySuccess ? '#4CAF50' : '#FFC107',
                  border: 'none',
                  color: copySuccess ? '#fff' : '#000',
                  fontSize: 14,
                  fontFamily,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: 100,
                }}
              >
                {copySuccess ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily }}>
              Nota: El enlace contiene todos los datos del arbol. Para arboles muy grandes, considera exportar como JSON.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  fontFamily,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// Helper function to load data from localStorage
export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    console.error('Error loading from localStorage');
  }
  return null;
}

// Helper function to load data from URL
export function loadFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const treeParam = params.get('tree');
    if (treeParam) {
      const decoded = decodeURIComponent(atob(treeParam));
      return JSON.parse(decoded);
    }
  } catch {
    console.error('Error loading from URL');
  }
  return null;
}

// Storage key export for external use
export { STORAGE_KEY };
