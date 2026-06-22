import React from 'react';

const STATUS_LABELS = {
  normal: "Operación Normal",
  high: "Carga Alta",
  critical: "Estado Crítico",
};

const STATUS_COLORS = {
  normal: "#a7f3d0",   // green
  high: "#fbbf24",     // amber
  critical: "#ef4444", // red
};

function AirportDetailPanel({ isVisible, selectedAirport = null, metrics = null, currentEpochTime = 0 }) {      
  if (!isVisible || !selectedAirport) {
    return null;
  }

  const { id, icao, name, city, country, continent, gmtOffset } = selectedAirport;
  
  const code = icao || id || "---";
  
  const stockBags = metrics?.storedBags ?? metrics?.load ?? 0;
  const maxCap = metrics?.warehouseCapacity ?? metrics?.capacity ?? 0;
  const status = metrics?.level ?? "normal";
  
  const statusLabel = STATUS_LABELS[status] ?? "Operación Normal";
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.normal;
  
  const pct = maxCap > 0 ? Math.min(100, Math.round((stockBags / maxCap) * 100)) : 0;
  const isFull = pct >= 100;

  // Calculamos la hora local del almacén usando su gmtOffset
  const localEpoch = currentEpochTime + ((gmtOffset || 0) * 3600000);
  const localTimeStr = currentEpochTime > 0 
    ? new Date(localEpoch).toLocaleString('es-ES', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
    : '--';

  // Traducción de continente
  const continentMap = { 'america': 'América', 'europe': 'Europa', 'asia': 'Asia' };
  const contName = continentMap[continent?.toLowerCase()] || continent;
  
  const formattedGmtDiff = gmtOffset > 0 ? `+${gmtOffset} horas` : `${gmtOffset} horas`;

  return (
    <aside 
      className="ct-panel--airport" 
      aria-label="Detalle de Almacén"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px', 
        width: '340px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        borderTop: `4px solid ${color}`,
        borderRadius: '8px',
        padding: '20px',
        zIndex: 1000,
        boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            🏢 ALMACÉN SELECCIONADO
          </span>
          <strong style={{ fontSize: '26px', display: 'block', margin: '6px 0 4px' }}>{code}</strong>
          <div style={{ fontSize: '14px', color: '#cbd5e1' }}>{name || `${city || ''}, ${country || ''}`}</div>
          {contName && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Continente: {contName}</div>}
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>HORA LOCAL</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#60a5fa' }}>{localTimeStr}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Diferencia UTC: <span style={{color: '#94a3b8', fontWeight: 600}}>{formattedGmtDiff}</span></div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Estado de capacidad</div>
          <strong style={{ color: color, fontSize: '14px' }}>{statusLabel}</strong>
        </div>
        
        <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', width: '100%', marginBottom: '10px' }}>
           <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: color, borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s ease-out' }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
           <span style={{ color: '#94a3b8' }}>{pct}% ocupado</span>
           <strong style={{ color: isFull ? '#ef4444' : 'white' }}>
             {stockBags ?? 0} / {maxCap || '?'} maletas
           </strong>
        </div>
      </div>
    </aside>
  );
}

export default AirportDetailPanel;
