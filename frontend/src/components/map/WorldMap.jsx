import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from "react-simple-maps";
import { interpolateCoordinates } from "../../data/airportsData";

// TopoJSON servido localmente — sin dependencia de red
const GEO_URL = "/world-110m.json";

// Proyección Mercator — escala aumentada para que los 3 continentes sean visibles
// rotate: rotación longitudinal (centra el mapa entre América y Asia)
const PROJECTION_CONFIG = {
  rotate: [-20, 0, 0],
  scale: 220,
  center: [15, 10],
};

/**
 * WorldMap — Componente raíz del mapa interactivo.
 *
 * Reemplaza la imagen MAPA.jpg + capas CSS de posicionamiento.
 * Los aeropuertos y aviones son elementos SVG con coordenadas [lng, lat] reales.
 *
 * Preparado para zoom futuro: acepta props `zoom` y `center` (no usadas aún).
 */
const WorldMap = ({
  airports = [],
  activeMetrics = {},
  activeAircraft = [],
  airportByIcao = {},
  isCollapseScenario = false,
  selectedAirportCode = "",
  selectedFromAirport = null,
  selectedToAirport = null,
  onAirportSelect = () => {},
  selectedAircraftId = null,
  onAircraftSelect = () => {},
  zoom = 1,
  center = [0, 20],
  onMoveEnd = () => {},
}) => (
  <div className="ct-world-map" aria-label="Mapa de operaciones global">
    <ComposableMap
      projection="geoMercator"
      projectionConfig={PROJECTION_CONFIG}
      className="ct-world-map__svg"
    >
      <ZoomableGroup zoom={zoom} center={center} onMoveEnd={onMoveEnd} maxZoom={8}>
        {/* ── Países ──────────────────────────────────────────────────────────── */}
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              className={`ct-map-country ${isCollapseScenario ? "ct-map-country--collapse" : ""}`}
              tabIndex={-1}
            />
          ))
        }
      </Geographies>

      {/* ── Ruta seleccionada (de origen a destino) ───────────────────────── */}
      {selectedFromAirport && selectedToAirport && (
        <Line
          from={selectedFromAirport.coordinates}
          to={selectedToAirport.coordinates}
          className="ct-map-route-line"
          strokeLinecap="round"
        />
      )}

      {/* ── Arcos de vuelos en tránsito ───────────────────────────────────── */}
      {activeAircraft.map((plane) => {
        const from = airportByIcao[plane.from];
        const to = airportByIcao[plane.to];
        if (!from || !to) return null;
        return (
          <Line
            key={`arc-${plane.id}`}
            from={from.coordinates}
            to={to.coordinates}
            className={`ct-map-flight-arc ct-map-flight-arc--${plane.status}`}
            strokeLinecap="round"
          />
        );
      })}

      {/* ── Aviones en tránsito ───────────────────────────────────────────── */}
      {activeAircraft.map((plane) => {
        const from = airportByIcao[plane.from];
        const to = airportByIcao[plane.to];
        if (!from || !to) return null;
        const position = interpolateCoordinates(from, to, plane.progress);
        const isBlocked = plane.status === "blocked";
        const isCancelled = plane.status === "cancelled";
        const isRescued = plane.status === "rescued";

        return (
          <Marker
            key={`plane-${plane.id}`}
            coordinates={position}
            style={{ transition: "transform 0.5s linear" }}
          >
            <g
              className={`ct-aircraft-pin ct-aircraft-pin--${plane.status} ${
                selectedAircraftId === plane.id ? "ct-aircraft-pin--selected" : ""
              }`}
              role="button"
              tabIndex={0}
              aria-label={`Vuelo ${plane.from} → ${plane.to}${isBlocked ? " — BLOQUEADO" : ""}${isCancelled ? " — CANCELADO" : ""}${isRescued ? " — RESCATADO" : ""}`}
              onClick={() => onAircraftSelect(plane.id)}
              onKeyDown={(e) => e.key === "Enter" && onAircraftSelect(plane.id)}
              style={{ cursor: "pointer", color: isCancelled ? '#ef4444' : isRescued ? '#3b82f6' : undefined }}
            >
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className={isBlocked ? "ct-aircraft-pin__blocked" : "ct-aircraft-pin__icon"}
                y={0}
                style={{ fontSize: isBlocked || isCancelled ? "12px" : "16px", fill: "currentColor" }}
              >
                {isCancelled ? "💥" : isBlocked ? "⚠️" : "✈"}
              </text>
            </g>
          </Marker>
        );
      })}

      {/* ── Marcadores de aeropuerto ──────────────────────────────────────── */}
      {airports.map((airport) => {
        const metrics = activeMetrics[airport.icao];
        const level = metrics?.level ?? "green";
        const isSaturated = isCollapseScenario && metrics?.isSaturated;
        const isSelected = selectedAirportCode === airport.icao;

        return (
          <Marker key={airport.icao} coordinates={airport.coordinates}>
            <g
              className={`ct-airport-marker ct-airport-marker--${level} ${
                isSaturated ? "ct-airport-marker--saturated" : ""
              } ${isSelected ? "ct-airport-marker--selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Aeropuerto ${airport.icao} en ${airport.city}`}
              onClick={() => onAirportSelect(airport.icao)}
              onKeyDown={(e) => e.key === "Enter" && onAirportSelect(airport.icao)}
              style={{ cursor: "pointer" }}
            >
              {/* Anillo exterior (pulso) */}
              <circle r={isSaturated ? 11 : 8} className="ct-airport-marker__ring" />
              {/* Punto central */}
              <circle r={isSaturated ? 6 : 4.5} className="ct-airport-marker__dot" />
              {/* Etiqueta ICAO */}
              <text
                y={-13}
                textAnchor="middle"
                className="ct-airport-marker__label"
              >
                {airport.icao}
              </text>
              {/* Etiqueta ciudad (se oculta en mobile via CSS) */}
              <text
                y={22}
                textAnchor="middle"
                className="ct-airport-marker__city"
              >
                {airport.city}
              </text>
            </g>
          </Marker>
        );
      })}
      </ZoomableGroup>
    </ComposableMap>
  </div>
);

export default WorldMap;
