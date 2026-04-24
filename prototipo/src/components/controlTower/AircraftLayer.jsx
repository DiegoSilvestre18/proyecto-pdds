import { interpolatePosition } from "../../data/controlTowerData";

const AircraftLayer = ({
  activeAircraft = [],
  airportByCode = {},
  onAircraftSelect = () => {},
  selectedAircraftId = null,
}) => (
  <div className="ct-aircraft-layer" aria-label="Vuelos en tránsito">
    {activeAircraft.map((plane) => {
      const fromAirport = airportByCode[plane.from];
      const toAirport = airportByCode[plane.to];

      if (!fromAirport || !toAirport) {
        return null;
      }

      const position = interpolatePosition(
        fromAirport,
        toAirport,
        plane.progress,
      );
      const isBlocked = plane.status === "blocked";

      return (
        <button
          key={plane.id}
          type="button"
          className={`ct-aircraft ct-aircraft--${plane.status} ${
            selectedAircraftId === plane.id ? "ct-aircraft--selected" : ""
          }`}
          style={{ top: position.top, left: position.left }}
          aria-label={`Vuelo ${plane.from} hacia ${plane.to}${isBlocked ? " — BLOQUEADO: destino saturado" : ""}`}
          title={
            isBlocked
              ? "Destino saturado — No puede descargar"
              : `${plane.from} → ${plane.to}`
          }
          onClick={() => onAircraftSelect(plane.id)}
        >
          {isBlocked ? (
            <span className="ct-aircraft-blocked-icon">✕</span>
          ) : (
            <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
              <path d="M2 13.2h6l4 7 2-.9-2.3-6.1h5.6l2.2 2.4 1.5-.5-.9-3.2.9-3.2-1.5-.5-2.2 2.4h-5.6L14 4.4l-2-.9-4 7H2z" />
            </svg>
          )}
        </button>
      );
    })}
  </div>
);

export default AircraftLayer;
