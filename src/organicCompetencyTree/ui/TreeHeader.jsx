export default function TreeHeader() {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '28px 32px',
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(13,27,42,0.95) 0%, transparent 100%)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(44px, 4.4vw, 80px)',
            fontWeight: 800,
            color: '#FFD54F',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: 'Georgia, serif',
            textShadow: '0 3px 0 rgba(0,0,0,0.55), 0 10px 24px rgba(0,0,0,0.45)',
            WebkitTextStroke: '1px rgba(0,0,0,0.45)',
          }}
        >
          🌳 Árbol de Competencias
        </h1>
      </div>
    </header>
  );
}
