const AirportDetailPanel = ({
  isCollapseScenario = false,
  isOpen = false,
  onClose = () => {},
  selectedAirport = null,
  selectedAirportLevel = "green",
  selectedAirportMetrics = null,
}) => {
  if (!isOpen || !selectedAirport || !selectedAirportMetrics) {
    return null;
  }

  return (
    <aside
      className={`ct-panel ct-panel--airport-detail ct-panel--airport-${selectedAirportLevel}`}
    >
      <div
        className={`ct-panel-header ct-panel-header--airport ct-panel-header--airport-${selectedAirportLevel}`}
      >
        <p>AEROPUERTO SELECCIONADO</p>
        <span className="ct-airport-panel-code">{selectedAirport.code}</span>
        <button
          type="button"
          className="ct-panel-close ct-panel-close--light"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
      <div className="ct-airport-detail">
        <h3>
          {selectedAirport.code} - {selectedAirport.city}
        </h3>
        <p>{selectedAirport.country}</p>
        <ul>
          <li>
            Almacén: <strong>{selectedAirportMetrics.warehouseId}</strong>
          </li>
          <li>
            Capacidad almacén:{" "}
            <strong>{selectedAirportMetrics.warehouseCapacity} maletas</strong>
          </li>
          <li>
            Ocupación actual:{" "}
            <strong>{selectedAirportMetrics.occupancy}%</strong>
          </li>
          <li>
            Maletas en almacén:{" "}
            <strong>{selectedAirportMetrics.storedBags}</strong>
          </li>
          <li>
            Semáforo capacidad almacén:{" "}
            <strong
              className={`ct-capacity-pill ct-capacity-pill--${selectedAirportLevel}`}
            >
              {selectedAirportMetrics.level.toUpperCase()}
            </strong>
          </li>
          <li>
            Estado: <strong>{selectedAirportMetrics.status}</strong>
          </li>
          {isCollapseScenario && selectedAirportMetrics.isSaturated && (
            <li className="ct-airport-detail__saturated">
              ⚠ <strong>ALMACÉN SATURADO</strong> — No acepta más maletas
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
};

export default AirportDetailPanel;
