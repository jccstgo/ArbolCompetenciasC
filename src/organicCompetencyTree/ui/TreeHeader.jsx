import { fontFamily } from './glassStyles.js';

export default function TreeHeader() {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(13,27,42,0.95) 0%, rgba(13,27,42,0.6) 60%, transparent 100%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(20px, 2vw, 32px)',
            fontWeight: 800,
            color: '#FFD54F',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontFamily,
            textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          Arbol de Competencias
        </h1>
      </div>
    </header>
  );
}
