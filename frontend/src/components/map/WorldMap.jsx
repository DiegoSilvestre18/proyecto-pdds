import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from "react-simple-maps";
import { interpolateCoordinates, AIRPORT_BY_ICAO } from "../../data/airportsData";
import { useSelectionBridge } from "../../hooks/useSelectionBridge";

const GEO_URL = "/world-110m.json";

const LEGEND_ITEMS = [
  { color: '#10b981', label: 'Nodo Estable (<70%)' },
  { color: '#f59e0b', label: 'Saturación Media (70-90%)' },
  { color: '#ef4444', label: 'Saturación Crítica (>90%)' },
  { color: '#3b82f6', label: 'Vuelo / UT en curso' },
  { color: '#f97316', label: 'Vuelo Crítico (carga alta)' },
  { color: '#6b7280', label: 'Cancelado' },
  { color: '#818cf8', label: 'Rescatado (ALNS)' },
  { color: 'rgba(255,255,255,0.25)', label: 'Completado (fade-out)' },
  { color: '#a78bfa', label: 'Ruta rastreada (Track & Trace)', style: 'dashed' },
];

const LegendButton = () => {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'absolute', bottom: 36, left: 62, zIndex: 200 }}>
      <button
        className="map-legend-btn"
        style={{ position: 'static' }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        aria-label="Ver leyenda del mapa"
        title="Leyenda"
      >
        ⓘ
      </button>
      {visible && (
        <div className="map-legend-popup" style={{ bottom: 40, left: 0 }}>
          <p>Leyenda Operativa</p>
          {LEGEND_ITEMS.map(item => (
            <div key={item.label} className="legend-row">
              <span className="legend-dot" style={{ background: item.color, borderStyle: item.style === 'dashed' ? 'dashed' : 'solid' }} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MapZoomControls = ({ zoom, center, onMoveEnd }) => (
    <div className="map-zoom-controls">
      <input
          type="range"
          min="0.5"
          max="10"
          step="0.01"
          value={zoom}
          onChange={(e) =>
              onMoveEnd({
                zoom: Number(e.target.value),
                coordinates: center
              })
          }
      />

      <button
          title="Centrar vista"
          onClick={() =>
              onMoveEnd({
                zoom: 0.86,
                coordinates: [7, 17]
              })
          }
      >
        ◎
      </button>
    </div>
);


const PROJECTION_CONFIG = {
  rotate: [-15, 0, 0],
  scale: 350,
  center: [22, 15],
};

// Zoom continuo con wheel — factor suavizado
const ZOOM_SPEED = 0.0012;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;

const clampZoom = (z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

const MapBackground = React.memo(({ isCollapseScenario }) => (
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
));

// Auxiliar para generar una trayectoria recta en la proyección (lineal en Lat/Lng)
// Esto evita que react-simple-maps dibuje arcos geodésicos curvos.
const getStraightPath = (start, end) => {
  if (!start || !end) return [];
  const steps = 100; // Suficientes puntos para una curva suave en proyección Mercator
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ]);
  }
  return path;
};



/**
 * WorldMap — Componente raíz del mapa interactivo.
 *
 * Soporta:
 * - Vinculación bidireccional Panel↔Mapa via SelectionBridge
 * - Estela progresiva (trail) detrás del avión
 * - Track & Trace con ruta multi-hop
 * - Highlights de excepciones (bloqueos/averías)
 * - Filtros visuales por semáforo
 * - Aviones en tierra diferenciados
 */
const WorldMap = ({
  airports = [],
  activeMetrics = {},
  activeAircraft = [],
  masterPlan = { planId: null, routes: [] },
  airportByIcao = {},
  isCollapseScenario = false,
  selectedAirportCode = "",
  selectedFromAirport = null,
  selectedToAirport = null,
  onAirportSelect = () => {},
  selectedAircraftId = null,
  onAircraftSelect = () => {},
  showCityLabels = true,
  zoom = 1,
  center = [0, 20],
  onMoveEnd = () => {},
  currentEpochTime = 0,
  systemClock = "--:--:--",
  simState = "idle",
  isDayToDay = false,
  onBackgroundClick = () => {},
}) => {
  // ── Filtros de Visibilidad Día a Día ─────────────────────────────────────
  const [showEmptyFlights, setShowEmptyFlights] = useState(true);
  const [showTestFlights, setShowTestFlights] = useState(true);
  // ── Selection Bridge ─────────────────────────────────────────────────────
  const {
    focusedEntity,
    setFocusedEntity,
    mapCommand,
    clearMapCommand,
    trackedRoute,
    clearTrackedRoute,
    exceptionHighlight,
    clearExceptionHighlight,
    activeFilters,
  } = useSelectionBridge();

  const [highlightedId, setHighlightedId] = useState(null);
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    if (!mapCommand) return;
    const { action, payload } = mapCommand;

    if (action === 'flyTo' && payload.coordinates) {
      onMoveEnd({
        zoom: payload.zoom || 4,
        coordinates: payload.coordinates,
      });
      if (payload.targetId) {
        setHighlightedId(payload.targetId);
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3000);
      }
    }

    if (action === 'highlight' && payload.targetId) {
      setHighlightedId(payload.targetId);
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3000);
    }

    clearMapCommand();
  }, [mapCommand, clearMapCommand, onMoveEnd]);

  useEffect(() => {
    return () => clearTimeout(highlightTimerRef.current);
  }, []);

  const nearbyOffsets = useMemo(() => {
    // Diccionario estático para evitar superposiciones en clusters densos.
    // 'top': texto arriba del icono
    // 'bottom': texto abajo (por defecto, pero se puede forzar)
    // 'left' / 'right': a los costados
    return {
      "EKCH": "top",    // Copenhague (norte del cluster)
      "EDDI": "left",   // Berlín (en el medio, lo tiramos a un lado)
      "LOWW": "topRight", // Viena (arriba a la derecha)
      "LDZA": "right",  // Zagreb (este)
      
      "OJAI": "left",
      "OSDI": "right",
      
      "SABE": "left",
      "SUAA": "right",
      
      "EHAM": "top",
      "EBCI": "bottomLeft",
    };
  }, []);

  const getStrokeColor = (status, ocupacion = 0, capacidadMax = 0) => {
    switch (status) {
      case "cancelled": return "#f43f5e";
      case "critical": return "#f59e0b";
      case "blocked": return "#e11d48";
      case "rescued": return "#3b82f6";
      default: {
        if (ocupacion === 0) return "#64748b";
        const pct = capacidadMax > 0 ? (ocupacion / capacidadMax) * 100 : 0;
        if (pct >= 90) return "#ef4444";
        if (pct >= 70) return "#f59e0b";
        return "#10b981";
      }
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "cancelled": return "CANCELADO";
      case "critical": return "CRÍTICO";
      case "blocked": return "BLOQUEADO";
      case "rescued": return "RESCATADO";
      default: return "A TIEMPO";
    }
  };

  const airportPassesFilter = useCallback((airportIcao) => {
    if (activeFilters.continent) {
      const ap = airports.find(a => a.icao === airportIcao);
      if (ap && ap.continent !== activeFilters.continent) return false;
    }
    if (!activeFilters.semaphoreLevel) return true;
    const metrics = activeMetrics[airportIcao];
    const level = metrics?.level ?? "green";
    return level === activeFilters.semaphoreLevel;
  }, [activeFilters.semaphoreLevel, activeFilters.continent, activeMetrics, airports]);

  const flightPassesFilter = useCallback((status) => {
    if (!activeFilters.flightStatus) return true;
    return status === activeFilters.flightStatus;
  }, [activeFilters.flightStatus]);

  const getAveriaColor = (averiaType) => {
    switch (parseInt(averiaType)) {
      case 1: return '#f59e0b';
      case 2: return '#f97316';
      case 3: return '#ef4444';
      case 4: return '#1e1b4b';
      default: return '#ef4444';
    }
  };

  return (
    <div 
      className="ct-world-map" 
      aria-label="Mapa de operaciones global" 
      style={{ position: "relative", width: "100%", height: "100%" }}
      onClick={() => {
        onAircraftSelect(null);
      }}
      // Zoom continuo con rueda
      onWheel={(e) => {
        e.preventDefault();
        const delta = -e.deltaY * ZOOM_SPEED;
        const factor = 1 + delta * (e.ctrlKey ? 3 : 1);
        onMoveEnd({ zoom: clampZoom(zoom * factor), coordinates: center });
      }}
      // Pan con clic de rueda (botón central)
      onMouseDown={(e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startCenter = [...center];

        // Factor de conversión px → grados (aproximado para la proyección actual)
        const pxPerDeg = (window.innerWidth / 360) * zoom;

        const onMove = (mv) => {
          const dx = (mv.clientX - startX) / pxPerDeg;
          const dy = -(mv.clientY - startY) / pxPerDeg * 0.7;
          onMoveEnd({
            zoom,
            coordinates: [
              startCenter[0] - dx,
              Math.max(-80, Math.min(80, startCenter[1] - dy)),
            ],
          });
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          document.body.style.cursor = '';
        };
        document.body.style.cursor = 'grabbing';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
    >
      {/* ── Control de Visibilidad de Vuelos ──────────────────────────────── */}
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(15, 23, 42, 0.85)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '2px', letterSpacing: '0.5px' }}>FILTROS DE VUELOS</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1' }}>
              <input type="checkbox" checked={showEmptyFlights} onChange={(e) => setShowEmptyFlights(e.target.checked)} style={{ accentColor: '#64748b', cursor: 'pointer', width: '14px', height: '14px' }} />
              <span>👁️ Mostrar vuelos sin envíos</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1' }}>
              <input type="checkbox" checked={showTestFlights} onChange={(e) => setShowTestFlights(e.target.checked)} style={{ accentColor: '#f97316', cursor: 'pointer', width: '14px', height: '14px' }} />
              <span>👁️ Mostrar vuelos con envíos</span>
            </label>
          </div>
      {/* ── Botón Flotante de Leyenda ( ⓘ ) ────────────────────────────────── */}
      <LegendButton />

      {/* ── Controles de Zoom Dark Mode ─────────────────────────────────────── */}
      <MapZoomControls zoom={zoom} center={center} onMoveEnd={onMoveEnd} />

      {/* ── Botón Limpiar Ruta Rastreada ────────────────────────────────────── */}
      {trackedRoute && (
        <button
          onClick={(e) => { e.stopPropagation(); clearTrackedRoute(); }}
          style={{
            position: 'absolute', bottom: 36, right: 20, zIndex: 200,
            background: 'rgba(167, 139, 250, 0.2)', border: '1px solid rgba(167, 139, 250, 0.5)',
            borderRadius: '8px', padding: '6px 14px', color: '#a78bfa',
            fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            backdropFilter: 'blur(6px)',
          }}
          title="Limpiar ruta rastreada del mapa"
        >
          ✕ Limpiar ruta rastreada
        </button>
      )}

      {/* ── Botón Limpiar Highlight de Excepción ───────────────────────────── */}
      {exceptionHighlight && (
        <button
          onClick={(e) => { e.stopPropagation(); clearExceptionHighlight(); }}
          style={{
            position: 'absolute', bottom: 70, right: 20, zIndex: 200,
            background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px', padding: '6px 14px', color: '#fca5a5',
            fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            backdropFilter: 'blur(6px)',
          }}
          title="Limpiar highlight de excepción"
        >
          ✕ Limpiar excepción
        </button>
      )}



      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG}
        className="ct-world-map__svg"
        onClick={(e) => { if (e.target === e.currentTarget && onBackgroundClick) onBackgroundClick(); }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={zoom} center={center} onMoveEnd={onMoveEnd} minZoom={0.5} maxZoom={10}>
          
          <MapBackground isCollapseScenario={isCollapseScenario} />

          {/* ── Fase 4: Proyección de Horizonte Maestro (Shadow Routes) ────── */}
          {/* Renderizado de rutas sombra eliminado a petición del usuario para limpiar el mapa */}



{/* ── Ruta seleccionada ──────────────────────────────────────────── */}
          {selectedFromAirport && selectedToAirport && (
            <Line
              coordinates={getStraightPath(selectedFromAirport.coordinates, selectedToAirport.coordinates)}
              className="ct-map-route-line"
              strokeLinecap="round"
              stroke="#818cf8"
              strokeWidth={3}
              style={{ filter: "drop-shadow(0 0 4px #818cf8)", opacity: 0.9 }}
            />
          )}

          {/* ── Paso 4: Track & Trace — Ruta multi-hop ─────────────────────── */}
          {trackedRoute && trackedRoute.hops && trackedRoute.hops.map((hop, idx) => {
            const from = airportByIcao[hop.from] || AIRPORT_BY_ICAO[hop.from];
            const to = airportByIcao[hop.to] || AIRPORT_BY_ICAO[hop.to];
            if (!from || !to) return null;
            return (
              <Line
                key={`track-${trackedRoute.shipmentId}-${idx}`}
                coordinates={getStraightPath(from.coordinates, to.coordinates)}
                stroke="#a78bfa"
                strokeWidth={3}
                strokeDasharray="8 4"
                style={{
                  filter: "drop-shadow(0 0 4px #a78bfa)",
                  opacity: 0.9,
                  animation: "ct-tracked-route-pulse 2s infinite ease-in-out",
                }}
                strokeLinecap="round"
              />
            );
          })}

          {/* ── Paso 4: Markers de parada intermedios para Track & Trace ──── */}
          {trackedRoute && trackedRoute.hops && trackedRoute.hops.map((hop, idx) => {
            const airport = airportByIcao[hop.from] || AIRPORT_BY_ICAO[hop.from];
            if (!airport) return null;
            return (
              <Marker key={`track-stop-${idx}`} coordinates={airport.coordinates}>
                <circle r={6} fill="rgba(167, 139, 250, 0.3)" stroke="#a78bfa" strokeWidth={2} />
                <text y={-10} textAnchor="middle" style={{ fontSize: '8px', fill: '#a78bfa', fontWeight: 'bold' }}>
                  {idx + 1}
                </text>
              </Marker>
            );
          })}
          {/* Marker final del Track & Trace */}
          {trackedRoute && trackedRoute.hops && trackedRoute.hops.length > 0 && (() => {
            const lastHop = trackedRoute.hops[trackedRoute.hops.length - 1];
            const airport = airportByIcao[lastHop.to] || AIRPORT_BY_ICAO[lastHop.to];
            if (!airport) return null;
            return (
              <Marker coordinates={airport.coordinates}>
                <circle r={6} fill="rgba(167, 139, 250, 0.3)" stroke="#a78bfa" strokeWidth={2} />
                <text y={-10} textAnchor="middle" style={{ fontSize: '8px', fill: '#a78bfa', fontWeight: 'bold' }}>
                  🏁
                </text>
              </Marker>
            );
          })()}

          {/* ── Paso 5: Highlight de Excepciones (bloqueos/averías) ──────── */}
          {exceptionHighlight && (() => {
            const exColor = exceptionHighlight.type === 'AVERIA'
              ? getAveriaColor(exceptionHighlight.averiaType)
              : '#ef4444';

            if (exceptionHighlight.type === 'TRAMO' && exceptionHighlight.origenIcao && exceptionHighlight.destinoIcao) {
              const from = airportByIcao[exceptionHighlight.origenIcao] || AIRPORT_BY_ICAO[exceptionHighlight.origenIcao];
              const to = airportByIcao[exceptionHighlight.destinoIcao] || AIRPORT_BY_ICAO[exceptionHighlight.destinoIcao];
              if (from && to) {
                return (
                  <Line
                    coordinates={getStraightPath(from.coordinates, to.coordinates)}
                    stroke={exColor}
                    strokeWidth={4}
                    strokeDasharray="6 3"
                    style={{
                      filter: `drop-shadow(0 0 8px ${exColor})`,
                      animation: "ct-exception-pulse 1.5s 3 ease-in-out",
                      opacity: 0.95,
                    }}
                    strokeLinecap="round"
                  />
                );
              }
            }

            if ((exceptionHighlight.type === 'NODO' || exceptionHighlight.type === 'AVERIA') && exceptionHighlight.origenIcao) {
              const airport = airportByIcao[exceptionHighlight.origenIcao] || AIRPORT_BY_ICAO[exceptionHighlight.origenIcao];
              if (airport) {
                return (
                  <Marker coordinates={airport.coordinates}>
                    <circle
                      r={18}
                      fill="transparent"
                      stroke={exColor}
                      strokeWidth={3}
                      style={{
                        animation: "ct-exception-pulse 1.5s 3 ease-in-out",
                        filter: `drop-shadow(0 0 10px ${exColor})`,
                      }}
                    />
                    <text y={28} textAnchor="middle" style={{ fontSize: '9px', fill: exColor, fontWeight: 'bold' }}>
                      {exceptionHighlight.type === 'AVERIA' ? `⚠ T${exceptionHighlight.averiaType}` : '🚫 BLOQUEADO'}
                    </text>
                  </Marker>
                );
              }
            }

            return null;
          })()}

          {/* ── Lógica de atenuación (Focus) + Filtros + Estela ── */}
          {(() => {
            const hasAnySelection = selectedAircraftId != null || (selectedAirportCode != null && selectedAirportCode !== "");
            const isPlaneSelected = (planeId) => selectedAircraftId === planeId;
            const getOpacity = (planeId, baseOpacity) => hasAnySelection ? (isPlaneSelected(planeId) ? baseOpacity : 0.1) : baseOpacity;

            return (
              <>
                {/* ── Trayectoria restante (Dashed line) ── */}
                {activeAircraft.map((plane) => {
                  const from = airportByIcao[plane.from];
                  const to   = airportByIcao[plane.to];
                  if (!from || !to) return null;

                  const progress = plane.progress ?? 0;
                  // Optimización: No renderizar ruta si el avión ya llegó
                  if (progress >= 0.99) return null;

                  const passesFilter = flightPassesFilter(plane.status);
                  const strokeColor = getStrokeColor(plane.status, plane.ocupacionReal, plane.capacidadMax);
                  
                  // Posición actual del avión
                  const position = interpolateCoordinates(from, to, progress);

                  // Trayectoria lineal restante
                  const remainingPath = getStraightPath(position, to.coordinates);
                  // Trayectoria ya recorrida (estela)
                  const traveledPath = progress > 0.02 ? getStraightPath(from.coordinates, position) : null;

                  return (
                    <React.Fragment key={plane.id}>
                      {/* Tramo recorrido (estela) — línea sólida tenue */}
                      {traveledPath && (
                        <Line
                          key={`trail-${plane.id}`}
                          coordinates={traveledPath}
                          stroke={strokeColor}
                          strokeWidth={0.8}
                          strokeLinecap="round"
                          style={{
                            opacity: passesFilter ? 0.15 : 0,
                            transition: "opacity 0.3s ease",
                            pointerEvents: "none"
                          }}
                        />
                      )}
                      {/* Tramo restante — línea discontinua */}
                      <Line
                        key={`path-${plane.id}`}
                        coordinates={remainingPath}
                        stroke={strokeColor}
                        strokeWidth={0.8}
                        strokeLinecap="round"
                        strokeDasharray="4 3"
                        style={{
                          opacity: passesFilter ? getOpacity(plane.id, 0.45) : 0,
                          transition: "opacity 0.3s ease",
                          pointerEvents: "none"
                        }}
                      />
                    </React.Fragment>
                  );
                })}

                {/* ── Aviones con ícono limpio y sombra ── */}
                {activeAircraft.map((plane) => {
                  const isEmpty = !plane.ocupacionReal || plane.ocupacionReal === 0;
                  if (isEmpty && !showEmptyFlights) return null;
                  if (!isEmpty && !showTestFlights) return null;
                  const from = airportByIcao[plane.from];
                  const to   = airportByIcao[plane.to];
                  if (!from || !to) return null;

                  const progress   = plane.progress ?? 0;
                  const position   = interpolateCoordinates(from, to, progress);
                  const isBlocked  = plane.status === "blocked";
                  const isCancelled= plane.status === "cancelled";
                  const isRescued  = plane.status === "rescued";
                  const isSelected = isPlaneSelected(plane.id);
                  const isHighlighted = highlightedId === plane.id;
                  const passesFilter = flightPassesFilter(plane.status);

                  const isOnGround = progress <= 0.01 || progress >= 0.99;
                  const isPreDeparture = progress <= 0.01;

                  const dx = to.coordinates[0] - from.coordinates[0];
                  const dy = to.coordinates[1] - from.coordinates[1];
                  const angle = Math.atan2(-dy, dx) * (180 / Math.PI);

                  let planeIcon = "✈";
                  let planeSize = "18px";
                  if (isBlocked || isCancelled) {
                    planeIcon = "✖";
                    planeSize = "14px";
                  } else if (isOnGround) {
                    planeIcon = isPreDeparture ? "⏳" : "🛬";
                    planeSize = "14px";
                  }

                  return (
                    <Marker
                      key={`plane-${plane.id}`}
                      coordinates={position}
                      style={{ transition: "transform 1.05s linear" }}
                    >
                      <g
                        className={`ct-aircraft-pin ct-aircraft-pin--${plane.status} ${
                          isSelected || isHighlighted ? "ct-aircraft-pin--selected" : ""
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Vuelo ${plane.from} → ${plane.to}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAircraftSelect(plane.id);
                          setFocusedEntity('flight', plane.id, 'map');
                        }}
                        onKeyDown={(e) => e.key === "Enter" && onAircraftSelect(plane.id)}
                        style={{ 
                          cursor: "pointer", 
                          color: isCancelled ? "#ef4444" : isRescued ? "#3b82f6" : getStrokeColor(plane.status, plane.ocupacionReal, plane.capacidadMax),
                          opacity: passesFilter ? getOpacity(plane.id, 1) : 0.08,
                          transition: "opacity 0.3s ease, color 0.3s ease",
                          filter: isSelected || isHighlighted 
                            ? `drop-shadow(0 0 6px ${getStrokeColor(plane.status, plane.ocupacionReal, plane.capacidadMax)})` 
                            : "drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                        }}
                      >
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          className={isBlocked ? "ct-aircraft-pin__blocked" : "ct-aircraft-pin__icon"}
                          y={0}
                          transform={isBlocked || isCancelled || isOnGround ? "" : `rotate(${angle})`}
                          style={{ 
                            fontSize: planeSize, 
                            fill: "currentColor", 
                            fontWeight: "bold",
                          }}
                        >
                          {planeIcon}
                        </text>

                      </g>
                    </Marker>
                  );
                })}
              </>
            );
          })()}

          {/* ── Marcadores de aeropuerto ──────────────────────────────────── */}
          {airports.map((airport) => {
            const metrics    = activeMetrics[airport.icao];
            const stockBags  = metrics?.storedBags ?? metrics?.load ?? 0;
            const maxCap     = metrics?.warehouseCapacity ?? metrics?.capacity ?? "—";
            const level      = stockBags === 0 && metrics ? "empty" : (metrics?.level ?? "green");
            const isSaturated= isCollapseScenario && metrics?.isSaturated;
            const hasAnySelection = selectedAircraftId != null || (selectedAirportCode != null && selectedAirportCode !== "");
            const isAirportSelected = selectedAirportCode === airport.icao;
            const isSelected = isAirportSelected || (focusedEntity?.type === 'airport' && focusedEntity?.id === airport.icao);
            const isHighlighted = highlightedId === airport.icao;
            const passesFilter = airportPassesFilter(airport.icao);
            const isDimmed = hasAnySelection && !isSelected;

            return (
              <Marker key={airport.icao} coordinates={airport.coordinates}>
                <g
                  className={`ct-airport-marker ct-airport-marker--${level} ${
                    isSaturated ? "ct-airport-marker--saturated" : ""
                  } ${isSelected || isHighlighted ? "ct-airport-marker--selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Aeropuerto ${airport.icao}`}
                  title={`Aeropuerto ${airport.icao}\nStock: ${stockBags} maletas / Capacidad: ${maxCap}`}
                  onClick={(e) => {
                    console.log("Airport clicked!", airport.icao);
                    e.stopPropagation();
                    onAirportSelect(airport.icao);
                    // Paso 3: Notificar al bridge (Mapa→Panel)
                    setFocusedEntity('airport', airport.icao, 'map');
                  }}
                  onKeyDown={(e) => e.key === "Enter" && onAirportSelect(airport.icao)}
                  style={{
                    cursor: "pointer",
                    opacity: passesFilter ? (isDimmed ? 0.15 : 1) : 0.05,
                    transition: "opacity 0.3s ease",
                    pointerEvents: passesFilter ? "auto" : "none",
                  }}
                >
                  {isSelected && (
                    <circle r={16} fill="none" stroke="currentColor" strokeWidth={2.5}
                            opacity={0.7} className="ct-airport-marker__selection-ring" />
                  )}
                  {/* Control tower SVG icon */}
                  <g
                    className="ct-airport-marker__tower"
                    transform={`scale(${isSaturated ? 1.0 : isHighlighted ? 1.1 : isSelected ? 0.9 : 0.7})`}
                    style={{
                      transformOrigin: 'center',
                      transition: 'transform 0.3s ease',
                      ...(isHighlighted ? { filter: 'drop-shadow(0 0 2px #facc15)', animation: 'ct-exception-pulse 1s 3 ease-in-out' } : {}),
                    }}
                  >
                    {/* Antenna */}
                    <line x1="0" y1="-11" x2="0" y2="-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="0" cy="-11.5" r="1.5" fill="currentColor"/>
                    {/* Cabin */}
                    <rect x="-5" y="-6.5" width="10" height="5" rx="1" fill="currentColor" opacity="0.9"/>
                    {/* Windows */}
                    <rect x="-3" y="-5" width="1.5" height="2" rx="0.3" fill="#061828"/>
                    <rect x="1.5" y="-5" width="1.5" height="2" rx="0.3" fill="#061828"/>
                    {/* Shaft */}
                    <rect x="-2.5" y="-1.5" width="5" height="8.5" rx="0.5" fill="currentColor" opacity="0.85"/>
                    {/* Door */}
                    <rect x="-0.75" y="4" width="1.5" height="3" rx="0.3" fill="#061828" opacity="0.5"/>
                  </g>
                  <rect x={-5} y={9} width={10} height={1.5} rx={0.5} fill="currentColor" opacity={0.5} />
                  {(() => {
                    const offset = nearbyOffsets[airport.icao];
                    let tAnchor = 'middle';
                    let tX = 0;
                    let tLabelY = -13, tCityY = 14, tInvY = 22;

                    if (offset === 'left') { tAnchor = 'end'; tX = -10; tLabelY = -4; tCityY = 2; tInvY = 10; }
                    else if (offset === 'right') { tAnchor = 'start'; tX = 10; tLabelY = -4; tCityY = 2; tInvY = 10; }
                    else if (offset === 'top') { tLabelY = -28; tCityY = -22; tInvY = -14; }
                    else if (offset === 'bottom') { tLabelY = 14; tCityY = 20; tInvY = 28; }
                    else if (offset === 'topRight') { tAnchor = 'start'; tX = 8; tLabelY = -18; tCityY = -12; tInvY = -4; }
                    else if (offset === 'topLeft') { tAnchor = 'end'; tX = -8; tLabelY = -18; tCityY = -12; tInvY = -4; }
                    else if (offset === 'bottomRight') { tAnchor = 'start'; tX = 8; tLabelY = 8; tCityY = 14; tInvY = 22; }
                    else if (offset === 'bottomLeft') { tAnchor = 'end'; tX = -8; tLabelY = 8; tCityY = 14; tInvY = 22; }

                    return (
                      <>
                        <text y={tLabelY} textAnchor={tAnchor} x={tX} className="ct-airport-marker__label">
                          {airport.icao}
                        </text>
                        <text y={tCityY} textAnchor={tAnchor} x={tX} className="ct-airport-marker__city">
                          {airport.city}
                        </text>
                        <text y={tInvY} textAnchor={tAnchor} x={tX} className="ct-airport-marker__inventory"
                              style={{ 
                                fontSize: "7px", fill: "#cbd5e1", fontWeight: "bold",
                                paintOrder: "stroke fill", stroke: "#061828", strokeWidth: "1.5px" 
                              }}>
                          {stockBags}/{maxCap}
                        </text>
                      </>
                    );
                  })()}
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* ── Overlay de Finalización ────────────────────────────────────────── */}
      {simState === "completed" && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(15, 23, 42, 0.95)",
          border: `2px solid ${isCollapseScenario ? "#ef4444" : "#10b981"}`,
          borderRadius: "16px",
          padding: "32px 48px",
          textAlign: "center",
          zIndex: 1000,
          backdropFilter: "blur(12px)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
          animation: "fadeIn 0.5s ease-out"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "900",
            color: isCollapseScenario ? "#fca5a5" : "#34d399",
            letterSpacing: "2px",
            marginBottom: "8px"
          }}>
            {isCollapseScenario ? "PUNTO DE QUIEBRE ALCANZADO" : "SIMULACIÓN COMPLETADA"}
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "300px", margin: "0 auto", lineHeight: "1.5" }}>
            {isCollapseScenario 
              ? "El sistema ha detectado una saturación física o caída crítica del SLA que impide continuar la operación normal." 
              : "Se han procesado todos los eventos del período solicitado exitosamente."}
          </div>
          <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center" }}>
            <button 
              onClick={(e) => { e.stopPropagation(); window.location.reload(); }}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Reiniciar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorldMap;
