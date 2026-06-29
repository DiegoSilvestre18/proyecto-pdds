import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import 'maplibre-gl/dist/maplibre-gl.css';

import { WebMercatorViewport } from "@deck.gl/core";
import { useSelectionBridge } from "../../hooks/useSelectionBridge";
import { AIRPORTS, AIRPORT_BY_ICAO, interpolateCoordinates } from "../../data/airportsData";

function getFitViewState(width = 1200, height = 800) {
  const bounds = AIRPORTS.reduce((acc, ap) => {
    const [lng, lat] = ap.coordinates
    return {
      minLng: Math.min(acc.minLng, lng),
      maxLng: Math.max(acc.maxLng, lng),
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat),
    }
  }, { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity })
  const padding = Math.min(width, height) * 0.12
  const viewport = new WebMercatorViewport({ width, height })
  const { longitude, latitude, zoom } = viewport.fitBounds(
    [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
    { padding }
  )
  return { longitude, latitude, zoom }
}

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
        onClick={() => setVisible(v => !v)}
        onFocus={() => setVisible(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setVisible(false) }}
        aria-label="Ver leyenda del mapa"
        aria-expanded={visible}
        title="Leyenda"
      >
        ⓘ
      </button>
      {visible && (
        <div className="map-legend-popup" role="region" aria-label="Leyenda del mapa" style={{ bottom: 40, left: 0 }}>
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

const MapZoomControls = ({ zoom, center, onMoveEnd, onBackgroundClick, onResetView }) => (
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
              onResetView?.()
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
  onMoveEnd = () => {},
  currentEpochTime = 0,
  systemClock = "--:--:--",
  simState = "idle",
  isDayToDay = false,
  onBackgroundClick = () => {},
  onReset = () => {},
}) => {
  const [showFlightsWithoutShipments, setShowFlightsWithoutShipments] = useState(true);
  const [showFlightsWithShipments, setShowFlightsWithShipments] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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
  const containerRef = useRef(null);

  const [viewState, setViewState] = useState(() => ({
    ...getFitViewState(),
    pitch: 0,
    bearing: 0
  }));

  useEffect(() => {
    if (!containerRef.current) return
    const { clientWidth, clientHeight } = containerRef.current
    if (clientWidth > 0 && clientHeight > 0) {
      setViewState(prev => ({ ...prev, ...getFitViewState(clientWidth, clientHeight) }))
    }
  }, [])

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

  const lastSelectedAircraftRef = useRef(null);

  // Tracking del avión seleccionado
  useEffect(() => {
    if (selectedAircraftId) {
      const plane = activeAircraft.find(p => p.id === selectedAircraftId);
      if (plane) {
        const from = airportByIcao[plane.from] || AIRPORT_BY_ICAO[plane.from];
        const to = airportByIcao[plane.to] || AIRPORT_BY_ICAO[plane.to];
        if (from && to) {
          const pos = interpolateCoordinates(from, to, plane.progress ?? 0);
          if (lastSelectedAircraftRef.current !== selectedAircraftId) {
            lastSelectedAircraftRef.current = selectedAircraftId;
            setViewState(prev => ({
              ...prev,
              longitude: pos[0],
              latitude: pos[1],
              zoom: 4,
              transitionDuration: 1000
            }));
          }
        }
      }
    } else {
      lastSelectedAircraftRef.current = null;
    }
  }, [selectedAircraftId, airportByIcao]);

  const lastSelectedAirportRef = useRef(null);

  // Zoom al aeropuerto seleccionado
  useEffect(() => {
    if (selectedAirportCode) {
      if (lastSelectedAirportRef.current !== selectedAirportCode) {
        lastSelectedAirportRef.current = selectedAirportCode;
        const ap = airportByIcao[selectedAirportCode] || AIRPORT_BY_ICAO[selectedAirportCode];
        if (ap && ap.coordinates) {
          setViewState(prev => ({
            ...prev,
            longitude: ap.coordinates[0],
            latitude: ap.coordinates[1],
            zoom: 3,
            transitionDuration: 1500 // Slower, smoother zoom
          }));
        }
      }
    } else {
      lastSelectedAirportRef.current = null;
    }
  }, [selectedAirportCode, airportByIcao]);

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
  const relatedAirportCodes = useMemo(() => {
    if (!selectedAirportCode) return new Set()
    const codes = new Set()
    activeAircraft.forEach(plane => {
      const isEmpty = !plane.ocupacionReal || plane.ocupacionReal === 0
      if (isEmpty) return
      if (plane.to === selectedAirportCode) codes.add(plane.from)
      if (plane.from === selectedAirportCode) codes.add(plane.to)
    })
    return codes
  }, [selectedAirportCode, activeAircraft])

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
      hasAnySelection,
      relatedAirportCodes
    }));

    // 3. Flights (Top)
    layerDefs.push(createFlightsLayer({
      activeAircraft,
      airportByIcao,
      selectedAircraftId,
      highlightedId,
      flightPassesFilter,
      showFlightsWithoutShipments,
      showFlightsWithShipments,
      hasAnySelection,
      selectedAirportCode
    }));

    return layerDefs;
  }, [
    airports, activeMetrics, activeAircraft, isCollapseScenario,
    selectedAirportCode, selectedAircraftId, focusedEntity, highlightedId,
    showFlightsWithoutShipments, showFlightsWithShipments, hasAnySelection,
    selectedFromAirport, selectedToAirport, trackedRoute, exceptionHighlight,
    airportPassesFilter, flightPassesFilter, airportByIcao, relatedAirportCodes
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
      ref={containerRef}
      className="ct-world-map" 
      aria-label="Mapa de operaciones global" 
      style={{ position: "relative", width: "100%", height: "100%", background: "#e5e3df" }}
    >
      <div className="ct-map-filter">
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`ct-map-filter-btn${showFilters ? ' ct-map-filter-btn--active' : ''}`}
          title="Filtros de vuelos"
        >
          ⚙ FILTROS {showFilters ? '▲' : '▼'}
        </button>

        {showFilters && (
          <div className="ct-map-filter-panel">
            <label className="ct-map-filter-check">
              <input type="checkbox" checked={showFlightsWithoutShipments} onChange={(e) => setShowFlightsWithoutShipments(e.target.checked)} style={{ accentColor: '#64748b' }} />
              <span>Vuelos sin envíos</span>
            </label>
            <label className="ct-map-filter-check">
              <input type="checkbox" checked={showFlightsWithShipments} onChange={(e) => setShowFlightsWithShipments(e.target.checked)} style={{ accentColor: '#f97316' }} />
              <span>Vuelos con envíos</span>
            </label>
          </div>
        )}
      </div>

      <LegendButton />
      <MapZoomControls 
        zoom={viewState.zoom} 
        center={[viewState.longitude, viewState.latitude]} 
        onMoveEnd={(pos) => {
          setViewState(prev => ({
            ...prev,
            zoom: pos.zoom,
            longitude: pos.coordinates[0],
            latitude: pos.coordinates[1],
            transitionDuration: 500
          }));
          onMoveEnd(pos);
        }}
        onBackgroundClick={onBackgroundClick}
        onResetView={() => {
          const w = containerRef.current?.clientWidth || 1200
          const h = containerRef.current?.clientHeight || 800
          const fitted = getFitViewState(w, h)
          setViewState(prev => ({ ...prev, ...fitted, transitionDuration: 800 }))
          onMoveEnd({ zoom: fitted.zoom, coordinates: [fitted.longitude, fitted.latitude] })
        }}
      />


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
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json"
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
              onClick={(e) => { e.stopPropagation(); onReset(); }}
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
