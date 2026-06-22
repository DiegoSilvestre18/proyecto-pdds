import React from 'react';

const STATUS_LABELS = {
  normal: "En tránsito",
  high: "Carga alta",
  critical: "Crítico",
  blocked: "Bloqueado",
  rescued: "Rescatado",
  cancelled: "Cancelado",
};

function formatFlightId(id) {
  if (!id) return "--";
  const parts = id.split('-');
  if (parts.length >= 2) {
    return `${parts[0].toUpperCase()}-${parts[1]}`;
  }
  return id;
}

function formatTimeWithDate(epoch) {
  if (!epoch) return '--';
  return new Date(epoch).toISOString().toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short'});
}

function ShipmentDetailPanel({ isVisible, selectedAircraft = null }) {      
  if (!isVisible || !selectedAircraft) {
    return null;
  }

  const statusLabel = STATUS_LABELS[selectedAircraft.status] ?? selectedAircraft.status ?? "En vuelo";
  const bagsLabel = `${selectedAircraft.ocupacionReal} / ${selectedAircraft.capacidadMax}`;
  const depTime = formatTimeWithDate(selectedAircraft.departureTime);
  const arrTime = formatTimeWithDate(selectedAircraft.arrivalTime);
  
  const progressPct = Math.min(100, Math.max(0, Math.round((selectedAircraft.progress ?? 0) * 100)));

  return (
    <aside 
      className="ct-panel--shipment" 
      aria-label="Detalle de Vuelo"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '360px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          ✈️ Detalle del Vuelo
        </span>
        <strong style={{ color: '#60a5fa', fontSize: '13px', backgroundColor: 'rgba(96, 165, 250, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
          {formatFlightId(selectedAircraft.id)}
        </strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', marginBottom: '16px' }}>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>Salida</div>
          <strong style={{ fontSize: '18px', display: 'block', margin: '2px 0' }}>{selectedAircraft.from}</strong>
          <div style={{ color: '#cbd5e1', fontSize: '11px' }}>{depTime}</div>
        </div>

        <div style={{ flex: 1.5, padding: '0 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '16px' }}>
           <div style={{ position: 'relative', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', width: '100%' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: '#60a5fa', borderRadius: '2px', width: `${progressPct}%`, transition: 'width 0.5s ease-out' }} />
              <div style={{ position: 'absolute', top: '-7px', left: `${progressPct}%`, fontSize: '14px', transform: 'translateX(-50%) rotate(45deg)', transition: 'left 0.5s ease-out' }}>✈️</div>
           </div>
           <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginTop: '10px', fontWeight: 600 }}>
             {progressPct}% Completado
           </div>
        </div>

        <div style={{ textAlign: 'right', flex: 1 }}>
          <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>Llegada</div>
          <strong style={{ fontSize: '18px', display: 'block', margin: '2px 0' }}>{selectedAircraft.to}</strong>
          <div style={{ color: '#cbd5e1', fontSize: '11px' }}>{arrTime}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px' }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Estado actual</div>
          <strong style={{ color: '#fbbf24', fontSize: '12px' }}>{statusLabel}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Carga confirmada</div>
          <strong style={{ fontSize: '12px', color: selectedAircraft.ocupacionReal >= selectedAircraft.capacidadMax ? '#ef4444' : '#a7f3d0' }}>
            {bagsLabel} maletas
          </strong>
        </div>
      </div>
    </aside>
  );
}

export default ShipmentDetailPanel;