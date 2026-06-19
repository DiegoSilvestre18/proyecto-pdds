import React from 'react';

const REPLAN_HISTORY = [
  { date: '2026-04-09 18:42', reason: 'Cancelación vuelo BOG→MEX', oldRoute: 'LIM→BOG→MEX→MAD', newRoute: 'LIM→BOG→IAD→LHR→MAD' },
]

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
  onHide, 
  searchedShipment, 
  selectedAircraft = null, 
  airportByCode = {},
  onSearch = () => {},
  isSearching = false
}) {      
  const [searchValue, setSearchValue] = React.useState("");

  if (!isVisible) {
    return null
  }

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const fromAirport = selectedAircraft ? airportByCode[selectedAircraft.from] : null;
  const toAirport = selectedAircraft ? airportByCode[selectedAircraft.to] : null;
  const routeLabel = selectedAircraft ? `${selectedAircraft.from} → ${selectedAircraft.to}` : "--";
  const statusLabel = selectedAircraft
    ? (STATUS_LABELS[selectedAircraft.status] ?? selectedAircraft.status ?? "En tránsito")
    : "--";
  const progressPct = selectedAircraft
    ? Math.round((selectedAircraft.progress ?? 0) * 100)
    : 0;
  const travelPlan = selectedAircraft ? [
    {
      airport: selectedAircraft.from,
      arrived: "—",
      departed: "—",
      status: progressPct > 10 ? "completado" : "en escala",
    },
    {
      airport: selectedAircraft.to,
      arrived: "—",
      departed: "—",
      status: progressPct > 85 ? "en escala" : "pendiente",
    },
  ] : [];
  const showMockHistory = !selectedAircraft;
  const s = searchedShipment;

  return (
    <aside className="ct-panel ct-panel--shipment" aria-label="Detalle de envío">
      <div className="ct-panel-header">
        <p>DETALLE DE ENVÍO {s?.isLocal ? '⚡ ACTIVO' : '🏛️ HISTÓRICO'}</p>
        <button type="button" className="ct-panel-close" onClick={onHide}>
          Ocultar
        </button>
      </div>

      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <form onSubmit={handleSearch} style={{ position: "relative", width: "100%" }}>
          <input 
            type="text" 
            placeholder="Buscar ID de envío..." 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              padding: "8px 12px",
              paddingRight: "35px",
              color: "white",
              fontSize: "12px",
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
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            {isSearching ? "⏳" : "🔍"}
          </button>
        </form>
      </div>

      {!s && !selectedAircraft ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Ingrese un ID en el buscador superior para localizar un envío específico o seleccione un vuelo del mapa.
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
              <strong>{s?.totalBags || '—'}</strong>
            </div>
            <div className="ct-shipment-detail__field">
              <span>Estado</span>
              <strong className={s?.status === 'cancelled' || selectedAircraft?.status === 'cancelled' ? 'ct-text-red' : 'ct-text-amber'}>
                {s ? s.status?.toUpperCase() : statusLabel}
              </strong>
            </div>
            <div className="ct-shipment-detail__field">
              <span>Llegada</span>
              <strong>{s?.arrival ? new Date(s.arrival).toLocaleString() : '—'}</strong>
            </div>
          </div>

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
                      <span>Llegada: {stop.arrived}</span>
                      <span>Salida: {stop.departed}</span>
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
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              * Este envío ya no está en la telemetría activa. Datos obtenidos del servidor.
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default ShipmentDetailPanel;