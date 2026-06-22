import React from 'react';

const STATUS_LABELS = {
  normal: "En tránsito",
  high: "Carga alta",
  critical: "Crítico",
  blocked: "Bloqueado",
  rescued: "Rescatado",
  cancelled: "Cancelado",
};

function ShipmentDetailPanel({ 
  isVisible, 
  searchedShipment, 
  selectedAircraft = null, 
  onSearch = () => {},
  isSearching = false,
  onCancelFlight = () => {},
}) {      
  const [searchValue, setSearchValue] = React.useState("");

  if (!isVisible) {
    return null
  }

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const s = searchedShipment;

  const routeLabel = selectedAircraft ? `${selectedAircraft.from} → ${selectedAircraft.to}` : "--";
  const statusLabel = selectedAircraft
    ? (STATUS_LABELS[selectedAircraft.status] ?? selectedAircraft.status ?? "En tránsito")
    : "--";
  const progressPct = selectedAircraft
    ? Math.round((selectedAircraft.progress ?? 0) * 100)
    : 0;

  const bagsLabel = s?.totalBags
    ?? (selectedAircraft ? `${selectedAircraft.ocupacionReal} / ${selectedAircraft.capacidadMax}` : '—');

  const fmtEpoch = (ep) => ep ? new Date(ep).toLocaleString() : '—';

  const arrivalLabel = s?.arrival
    ? new Date(s.arrival).toLocaleString()
    : fmtEpoch(selectedAircraft?.arrivalTime);

  const travelPlan = selectedAircraft ? [
    {
      airport: selectedAircraft.from,
      label: 'Salida',
      time: fmtEpoch(selectedAircraft.departureTime),
      status: progressPct > 10 ? "completado" : "en escala",
    },
    {
      airport: selectedAircraft.to,
      label: 'Llegada',
      time: fmtEpoch(selectedAircraft.arrivalTime),
      status: progressPct > 85 ? "en escala" : "pendiente",
    },
  ] : [];

  return (
    <aside 
      className="ct-panel--shipment" 
      aria-label="Detalle de envío"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '320px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ padding: '0 0 4px', fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        DETALLE DE ENVÍO {s?.isLocal ? '⚡ ACTIVO' : '🏛️ HISTÓRICO'}
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <form onSubmit={handleSearch} style={{ position: "relative", width: "100%" }}>
          <input 
            type="text" 
            placeholder="Buscar ID..." 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              padding: "5px 10px",
              paddingRight: "30px",
              color: "white",
              fontSize: "11px",
              width: "100%",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          <button 
            type="submit"
            disabled={isSearching}
            style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "12px",
              padding: "2px"
            }}
          >
            {isSearching ? "⏳" : "🔍"}
          </button>
        </form>
      </div>

      {!s && !selectedAircraft ? (
        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
          Ingrese un ID en el buscador o seleccione un vuelo del mapa.
        </div>
      ) : (
        <div className="ct-shipment-detail">
          <div className="ct-shipment-detail__summary">
            <div className="ct-shipment-detail__field">
              <span>ID Envío / Vuelo</span>
              <strong style={{ color: '#60a5fa' }}>{s?.id || selectedAircraft?.id}</strong>
            </div>
            <div className="ct-shipment-detail__field">
              <span>Ruta</span>
              <strong>{s ? `${s.origin} → ${s.destination}` : routeLabel}</strong>
            </div>
            <div className="ct-shipment-detail__field">
              <span>Maletas / Capacidad</span>
              <strong>{bagsLabel}</strong>
            </div>
            <div className="ct-shipment-detail__field">
              <span>Estado</span>
              <strong className={s?.status === 'cancelled' || selectedAircraft?.status === 'cancelled' ? 'ct-text-red' : 'ct-text-amber'}>
                {s ? s.status?.toUpperCase() : statusLabel}
              </strong>
            </div>
            <div className="ct-shipment-detail__field">
              <span>Llegada</span>
              <strong>{arrivalLabel}</strong>
            </div>
          </div>

          {selectedAircraft && !s && (
            <button onClick={onCancelFlight} style={{
              width: '100%', marginTop: 6, padding: '5px', borderRadius: 4,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              🚫 Cancelar / Reprogramar Vuelo
            </button>
          )}

          {s?.route && s.route.length > 0 && (
            <div className="ct-config-section">
              <p className="ct-config-section__title">🗺️ PLAN DE VIAJE</p>
              <div className="ct-travel-plan">
                {s.route.map((hop, i) => (
                  <div key={i} className="ct-travel-stop">
                    <div className="ct-travel-stop__dot" />
                    <div className="ct-travel-stop__info">
                      <strong>Vuelo: {hop.id}</strong>
                      <span>Tramo: {hop.from} → {hop.to}</span>
                      <span>Dep: {hop.dep} | Arr: {hop.arr}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedAircraft && !s && (
            <div className="ct-config-section">
              <p className="ct-config-section__title">🗺️ PLAN DE VIAJE</p>
              <div className="ct-travel-plan">
                {travelPlan.map((stop, i) => (
                  <div key={i} className={`ct-travel-stop ct-travel-stop--${stop.status === 'completado' ? 'done' : stop.status === 'en escala' ? 'current' : 'pending'}`}>
                    <div className="ct-travel-stop__dot" />
                    <div className="ct-travel-stop__info">
                      <strong>{stop.airport}</strong>
                      <span>{stop.label}: {stop.time}</span>
                    </div>
                    <span className={`ct-travel-stop__status ct-travel-stop__status--${stop.status === 'completado' ? 'done' : stop.status === 'en escala' ? 'current' : 'pending'}`}>
                      {stop.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {s && !s.isLocal && (
            <div style={{ marginTop: '8px', fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
              * Envío histórico (no está en telemetría activa).
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default ShipmentDetailPanel;