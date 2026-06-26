import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import 'maplibre-gl/dist/maplibre-gl.css';

import { useSelectionBridge } from "../../hooks/useSelectionBridge";
import { AIRPORT_BY_ICAO } from "../../data/airportsData";

import { createAirportsLayers } from "./layers/AirportsLayer";
import { createFlightsLayer } from "./layers/FlightsLayer";
import { createRoutesLayers } from "./layers/RoutesLayer";
import { getStraightPath } from "./layers/utils";

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

const MapZoomControls = ({ zoom, center, onMoveEnd, onBackgroundClick }) => (
    <div className="map-zoom-controls" style={{ zIndex: 200, position: 'absolute' }}>
      <input
          type="range"
          min="1"
          max="10"
          step="0.1"
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
          onClick={() => {
              onBackgroundClick?.()
              onMoveEnd({
                zoom: 2,
                coordinates: [15, 22] // Europe/Africa center
              })
          }}
      >
        ◎
      </button>
    </div>
);


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
  zoom = 2,
  center = [15, 22],
  onMoveEnd = () => {},
  currentEpochTime = 0,
  systemClock = "--:--:--",
  simState = "idle",
  isDayToDay = false,
  onBackgroundClick = () => {},
}) => {
  const [showEmptyFlights, setShowEmptyFlights] = useState(true);
  const [showTestFlights, setShowTestFlights] = useState(true);

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

  // Translate react-simple-maps props to deck.gl viewState
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom,
    pitch: 0,
    bearing: 0
  });

  // Sync incoming props to internal view state
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: center[0],
      latitude: center[1],
      zoom: zoom
    }));
  }, [center, zoom]);

  const handleViewStateChange = useCallback(({ viewState }) => {
    setViewState(viewState);
    onMoveEnd({
      zoom: viewState.zoom,
      coordinates: [viewState.longitude, viewState.latitude]
    });
  }, [onMoveEnd]);

  useEffect(() => {
    if (!mapCommand) return;
    const { action, payload } = mapCommand;

    if (action === 'flyTo' && payload.coordinates) {
      setViewState({
        longitude: payload.coordinates[0],
        latitude: payload.coordinates[1],
        zoom: payload.zoom || 5,
        pitch: 0,
        bearing: 0,
        transitionDuration: 1000
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
  }, [mapCommand, clearMapCommand]);

  useEffect(() => {
    return () => clearTimeout(highlightTimerRef.current);
  }, []);

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

  const flightPassesFilter = useCallback((status, fromIcao, toIcao) => {
    if (activeFilters.flightStatus && status !== activeFilters.flightStatus) return false;
    if (activeFilters.continent) {
      const fromAirport = airportByIcao[fromIcao];
      const toAirport = airportByIcao[toIcao];
      const fromMatch = fromAirport?.continent === activeFilters.continent;
      const toMatch = toAirport?.continent === activeFilters.continent;
      if (!fromMatch || !toMatch) return false;
    }
    if (activeFilters.semaphoreLevel) {
      const checkSemaphore = (icao) => {
        const m = activeMetrics[icao];
        return (m?.level ?? "green") === activeFilters.semaphoreLevel;
      };
      if (!checkSemaphore(fromIcao) && !checkSemaphore(toIcao)) return false;
    }
    return true;
  }, [activeFilters.flightStatus, activeFilters.continent, activeFilters.semaphoreLevel, activeMetrics, airportByIcao]);

  const hasAnySelection = selectedAircraftId != null || (selectedAirportCode != null && selectedAirportCode !== "");

  const layers = useMemo(() => {
    const layerDefs = [];

    // 1. Routes (Bottom)
    layerDefs.push(...createRoutesLayers({
      activeAircraft,
      airportByIcao,
      selectedFromAirport,
      selectedToAirport,
      trackedRoute,
      exceptionHighlight,
      selectedAircraftId,
      hasAnySelection,
      flightPassesFilter,
      selectedAirportCode
    }));

    // 2. Airports
    layerDefs.push(...createAirportsLayers({
      airports,
      activeMetrics,
      isCollapseScenario,
      selectedAirportCode,
      focusedEntity,
      highlightedId,
      airportPassesFilter,
      hasAnySelection
    }));

    // 3. Flights (Top)
    layerDefs.push(createFlightsLayer({
      activeAircraft,
      airportByIcao,
      selectedAircraftId,
      highlightedId,
      flightPassesFilter,
      showEmptyFlights,
      showTestFlights,
      hasAnySelection,
      selectedAirportCode
    }));

    return layerDefs;
  }, [
    airports, activeMetrics, activeAircraft, isCollapseScenario,
    selectedAirportCode, selectedAircraftId, focusedEntity, highlightedId,
    showEmptyFlights, showTestFlights, hasAnySelection,
    selectedFromAirport, selectedToAirport, trackedRoute, exceptionHighlight,
    airportPassesFilter, flightPassesFilter, airportByIcao
  ]);

  const onLayerClick = useCallback((info, event) => {
    if (!info.object) {
      onBackgroundClick();
      onAircraftSelect(null);
      return;
    }

    if (info.layer.id === 'airports-layer') {
      onAirportSelect(info.object.icao);
      setFocusedEntity('airport', info.object.icao, 'map');
    } else if (info.layer.id === 'flights-icon-layer' || info.layer.id === 'flights-text-layer') {
      onAircraftSelect(info.object.id);
      setFocusedEntity('flight', info.object.id, 'map');
    }
  }, [onAirportSelect, onAircraftSelect, onBackgroundClick, setFocusedEntity]);

  // Precompute full paths per route — recomputed only when activeAircraft changes, not every frame
  const routeFullPaths = useMemo(() => {
    const cache = {};
    const pathByRoute = {};
    activeAircraft.forEach(plane => {
      const from = airportByIcao[plane.from];
      const to = airportByIcao[plane.to];
      if (!from || !to) return;
      const key = `${plane.from}__${plane.to}`;
      if (!pathByRoute[key]) {
        pathByRoute[key] = getStraightPath(from.coordinates, to.coordinates);
      }
      cache[plane.id] = pathByRoute[key];
    });
    return cache;
  }, [activeAircraft, airportByIcao]);

  return (
    <div 
      className="ct-world-map" 
      aria-label="Mapa de operaciones global" 
      style={{ position: "relative", width: "100%", height: "100%", background: "#061828" }}
    >
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

      <LegendButton />
      <MapZoomControls zoom={viewState.zoom} center={[viewState.longitude, viewState.latitude]} onMoveEnd={onMoveEnd} />


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

      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        onClick={onLayerClick}
        getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
          reuseMaps
          preventStyleDiffing
        />
      </DeckGL>


      {simState === "completed" && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(15, 23, 42, 0.95)", border: `2px solid ${isCollapseScenario ? "#ef4444" : "#10b981"}`,
          borderRadius: "16px", padding: "32px 48px", textAlign: "center", zIndex: 1000,
          backdropFilter: "blur(12px)", boxShadow: "0 20px 50px rgba(0,0,0,0.7)", animation: "fadeIn 0.5s ease-out"
        }}>
          <div style={{ fontSize: "24px", fontWeight: "900", color: isCollapseScenario ? "#fca5a5" : "#34d399", letterSpacing: "2px", marginBottom: "8px" }}>
            {isCollapseScenario ? "PUNTO DE QUIEBRE ALCANZADO" : "SIMULACIÓN COMPLETADA"}
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "300px", margin: "0 auto", lineHeight: "1.5" }}>
            {isCollapseScenario ? "El sistema ha detectado una saturación física o caída crítica del SLA que impide continuar la operación normal." : "Se han procesado todos los eventos del período solicitado exitosamente."}
          </div>
          <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center" }}>
            <button 
              onClick={(e) => { e.stopPropagation(); window.location.reload(); }}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
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
