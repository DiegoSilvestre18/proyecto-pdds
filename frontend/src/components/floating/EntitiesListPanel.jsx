import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSelectionBridge } from '../../hooks/useSelectionBridge';
import { FixedSizeList as List } from 'react-window';

const statusColors = {
  critical: '#ef4444',
  blocked: '#f59e0b',
  rescued: '#3b82f6',
  cancelled: '#ef4444',
  high: '#f97316',
  normal: '#10b981',
  default: '#64748b'
};

const getLevelColor = (percent) => {
  if (percent >= 90) return '#ef4444';
  if (percent >= 70) return '#f59e0b';
  return '#10b981';
};

const FlightRow = React.memo(function FlightRow({ index, style, data }) {
  const { flights, expandedUt, handleSelectUT, setExpandedUt, focusedEntity, utRefsMap } = data;
  const ut = flights[index];
  if (!ut) return null;

  const numericId = ut.id ? ut.id.toString().replace("vuelo-", "").split("-")[0] : null;
  const pct = ut.capacityPercent?.toFixed(1) || 0;
  const semaforo = getLevelColor(pct);
  const isExpanded = expandedUt === ut.id;
  const isFocused = focusedEntity?.type === 'flight' && focusedEntity?.id === ut.id;

  return (
      <div style={{ ...style, padding: '2px 4px', boxSizing: 'border-box' }}>
        <div style={{
          background: isFocused ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          border: `1px solid ${isFocused ? '#60a5fa' : (statusColors[ut.status] || statusColors.default)}`,
          overflow: 'hidden',
          height: '100%',

          // 👇 UX improvements
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
        }}>
          <div
              style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
              onClick={() => { setExpandedUt(isExpanded ? null : ut.id); handleSelectUT(ut); }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: '#e2e8f0', fontSize: '13px' }}>Vuelo {numericId}</span>
                <span style={{ background: statusColors[ut.status] || statusColors.default, fontSize: '10px', padding: '2px 6px', borderRadius: '12px', color: '#fff', textTransform: 'uppercase' }}>{ut.status}</span>
              </div>
              <div
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    maxWidth: '100%',
                    alignItems: 'center'
                  }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>{ut.from}</span>
                <span>➔</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', display: 'inline-block',verticalAlign: 'bottom' }}>
    {ut.to}
  </span>
              </div>
            </div>
            <div style={{ minWidth: '170px',textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: semaforo }}>{pct}%</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{ut.ocupacionReal || 0} / {ut.capacidadMax || 0} maletas</div>
            </div>
          </div>
        </div>
      </div>
  );
}, (prev, next) => {
  // Comparador fino: solo re-renderiza si ESTE vuelo cambió relevantemente
  const a = prev.data.flights[prev.index];
  const b = next.data.flights[next.index];
  return a?.id === b?.id
      && a?.status === b?.status
      && a?.capacityPercent === b?.capacityPercent
      && a?.ocupacionReal === b?.ocupacionReal
      && prev.data.expandedUt === next.data.expandedUt
      && prev.data.focusedEntity?.id === next.data.focusedEntity?.id;
});



function FlightDetailPanel({ flight, onClose }) {
  if (!flight) return null;

  const numericId = flight.id ? flight.id.toString().replace("vuelo-", "").split("-")[0] : null;

  return (
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '6px',
        padding: '12px',
        border: '1px solid rgba(96,165,250,0.3)',
        position: 'relative',
      }}>
        <button
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}
        >
          ✕
        </button>

        <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '8px', fontWeight: 'bold' }}>
          ✈ Vuelo {numericId} — {flight.from} ➔ {flight.to}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#9ca3af', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
          <span>Ocupación Real</span>
          <span style={{ color: '#e2e8f0' }}>{flight.ocupacionReal || 0} maletas</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#9ca3af', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
          <span>Capacidad Máxima</span>
          <span style={{ color: '#e2e8f0' }}>{flight.capacidadMax || 0} maletas</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#9ca3af', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
          <span>Progreso</span>
          <span style={{ color: '#e2e8f0' }}>{((flight.progress ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#9ca3af' }}>
          <span>Estado</span>
          <span style={{ color: statusColors[flight.status] || statusColors.default, fontWeight: 'bold', textTransform: 'uppercase' }}>
          {flight.status}
        </span>
        </div>
      </div>
  );
}

const getLevelName = (percent) => {
  if (percent >= 90) return 'red';
  if (percent >= 70) return 'amber';
  return 'green';
};

// ── Paso 6: Botones de filtro por semáforo ─────────────────────────────────
const SEMAPHORE_OPTIONS = [
  { value: null,    label: '⬜ Todos',   color: '#94a3b8' },
  { value: 'green', label: '🟢 Estable', color: '#10b981' },
  { value: 'amber', label: '🟡 Media',   color: '#f59e0b' },
  { value: 'red',   label: '🔴 Crítico', color: '#ef4444' },
];

const FLIGHT_STATUS_OPTIONS = [
  { value: null,        label: '⬜ Todos',     color: '#94a3b8' },
  { value: 'normal',    label: '🟢 Baja ocupación',    color: '#10b981' },
  { value: 'critical',  label: '🟡 Ocupación media',   color: '#f59e0b' },
  { value: 'cancelled', label: '🔴 Alta ocupación', color: '#ef4444' },
];

export default function EntitiesListPanel({ activeAircraft, airports, airportMetrics, onSelectFlight, onAirportSelect }) {
  const [activeTab, setActiveTab] = useState('ut');
  // UT Filters & Sort
  const [utSearch, setUtSearch] = useState('');
  const [utSearchOrigin, setUtSearchOrigin] = useState('');
  const [utSearchDest, setUtSearchDest] = useState('');
  const [utSort, setUtSort] = useState('occupancy_desc');
  const [expandedUt, setExpandedUt] = useState(null);

  // Warehouse Filters & Sort
  const [whSearch, setWhSearch] = useState('');
  const [whSort, setWhSort] = useState('occupancy_desc');
  const [expandedWh, setExpandedWh] = useState(null);

  const listContainerRef = useRef(null);
  const [listHeight, setListHeight] = useState(0);




  useEffect(() => {
    if (!listContainerRef.current) return;

    const updateHeight = () => {
      const rect = listContainerRef.current.getBoundingClientRect();
      setListHeight(rect.height);
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(listContainerRef.current);

    return () => ro.disconnect();
  }, [activeTab]);


  
  // ── Selection Bridge ─────────────────────────────────────────────────────
  const {
    focusedEntity,
    setFocusedEntity,
    clearFocusedEntity,
    dispatchMapCommand,
    activeFilters,
    setActiveFilters,
  } = useSelectionBridge();



  // ── Refs para scroll automático ────────────────────────────────────────
  const utRefsMap = useRef({});
  const whRefsMap = useRef({});
  const scrollContainerRef = useRef(null);
  const lastMapSelectionRef = useRef(null);

  // ── Responder a selección desde el mapa ────────────────────────────────
  useEffect(() => {
    if (!focusedEntity || focusedEntity.source !== 'map') return;

    if (focusedEntity.type === 'flight') {
      setActiveTab('ut');
      setExpandedUt(focusedEntity.id);
      lastMapSelectionRef.current = { type: 'flight', id: focusedEntity.id };
    }

    if (focusedEntity.type === 'airport') {
      setActiveTab('wh');
      setExpandedWh(focusedEntity.id);
      lastMapSelectionRef.current = { type: 'airport', id: focusedEntity.id };
    }
  }, [focusedEntity]);

  // ── Scroll AFTER DOM listo (activeTab/expandedWh renderizados) ──────────
  useEffect(() => {
    const last = lastMapSelectionRef.current;
    if (!last) return;

    const refMap = last.type === 'flight' ? utRefsMap : whRefsMap;
    const ref = refMap.current[last.id];

    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.classList.add('ct-entity-highlighted');
      setTimeout(() => ref.classList.remove('ct-entity-highlighted'), 2500);
      lastMapSelectionRef.current = null;
    }
  }, [activeTab, expandedWh, expandedUt]);

  // ── Clic en panel → enfocar en mapa ────────────────────────────────────
  const handleSelectUT = useCallback((ut) => {
    setFocusedEntity('flight', ut.id, 'panel');
    if (onSelectFlight) onSelectFlight(ut.id);
  }, [setFocusedEntity, onSelectFlight]);

  const handleSelectWarehouse = useCallback((wh) => {
    if (!wh) {
      clearFocusedEntity();
      if (onAirportSelect) onAirportSelect(null);
      return;
    }
    setFocusedEntity('airport', wh.icao, 'panel');
    if (onAirportSelect) onAirportSelect(wh.icao);
    dispatchMapCommand('flyTo', {
      coordinates: wh.coordinates,
      zoom: 3,
      targetId: wh.icao,
    });
  }, [setFocusedEntity, clearFocusedEntity, dispatchMapCommand, onAirportSelect]);

  // ── Paso 6: Handler de filtro por semáforo ──────────────────────────────
  const handleSemaphoreFilter = useCallback((level) => {
    setActiveFilters(prev => ({ ...prev, semaphoreLevel: level }));
  }, [setActiveFilters]);

  const handleFlightStatusFilter = useCallback((status) => {
    setActiveFilters(prev => ({ ...prev, flightStatus: status }));
  }, [setActiveFilters]);

  const handleContinentFilter = useCallback((continent) => {
    setActiveFilters(prev => ({ ...prev, continent }));
  }, [setActiveFilters]);

  const filteredUTs = useMemo(() => {
    if (activeTab !== 'ut') return []; // ← evita filtrar/ordenar si no se muestra
    let result = [...(activeAircraft || [])];

    if (utSearch) {
      const q = utSearch.toLowerCase();
      result = result.filter(ut => ut.id?.toLowerCase().includes(q));
    }

    if (utSearchOrigin) {
      const q = utSearchOrigin.toLowerCase();
      result = result.filter(ut => ut.from?.toLowerCase().includes(q));
    }

    if (utSearchDest) {
      const q = utSearchDest.toLowerCase();
      result = result.filter(ut => ut.to?.toLowerCase().includes(q));
    }

    // Paso 6: Filtro por status de semáforo
    if (activeFilters.flightStatus) {
      result = result.filter(ut => ut.status === activeFilters.flightStatus);
    }

    result.sort((a, b) => {
      if (utSort === 'occupancy_desc') return (b.capacityPercent || 0) - (a.capacityPercent || 0);
      if (utSort === 'occupancy_asc') return (a.capacityPercent || 0) - (b.capacityPercent || 0);
      if (utSort === 'dep_asc') return (a.departureTime || 0) - (b.departureTime || 0);
      if (utSort === 'arr_asc') return (a.arrivalTime || 0) - (b.arrivalTime || 0);
      if (utSort === 'origin') return (a.from || '').localeCompare(b.from || '');
      if (utSort === 'dest') return (a.to || '').localeCompare(b.to || '');
      return 0;
    });

    return result;
  }, [activeAircraft, utSearch, utSearchOrigin, utSearchDest, utSort, activeFilters.flightStatus]);

  const selectedFlightDetail = useMemo(() => {
    if (!expandedUt) return null;
    return (activeAircraft || []).find(ut => ut.id === expandedUt) || null;
  }, [expandedUt, activeAircraft]);

  const filteredWarehouses = useMemo(() => {
    if (activeTab !== 'wh') return [];
    let result = [...(airports || [])];
    
    if (whSearch) {
      const q = whSearch.toLowerCase();
      result = result.filter(wh => 
        wh.icao?.toLowerCase().includes(q) ||
        wh.city?.toLowerCase().includes(q)
      );
    }

    // Paso 6: Filtro por semáforo de almacén
    if (activeFilters.semaphoreLevel) {
      result = result.filter(wh => {
        const m = airportMetrics[wh.icao] || {};
        const pct = m.occupancy ?? 0;
        return getLevelName(pct) === activeFilters.semaphoreLevel;
      });
    }

    // Item 2: Filtro por continente
    if (activeFilters.continent) {
      result = result.filter(wh => wh.continent === activeFilters.continent);
    }

    // Items 4 & 5: Computar próxima salida/llegada de UT por almacén
    const nearestDep = {}
    const nearestArr = {}
    ;(activeAircraft || []).forEach(f => {
      if (f.from) nearestDep[f.from] = Math.min(nearestDep[f.from] ?? Infinity, f.departureTime ?? Infinity)
      if (f.to) nearestArr[f.to] = Math.min(nearestArr[f.to] ?? Infinity, f.arrivalTime ?? Infinity)
    })

    result.sort((a, b) => {
      const mA = airportMetrics[a.icao] || {};
      const mB = airportMetrics[b.icao] || {};
      const pctA = mA.occupancy ?? 0;
      const pctB = mB.occupancy ?? 0;

      if (whSort === 'occupancy_desc') return pctB - pctA;
      if (whSort === 'occupancy_asc') return pctA - pctB;
      if (whSort === 'next_departure') return (nearestDep[a.icao] ?? Infinity) - (nearestDep[b.icao] ?? Infinity);
      if (whSort === 'next_arrival') return (nearestArr[a.icao] ?? Infinity) - (nearestArr[b.icao] ?? Infinity);
      if (whSort === 'name_asc') return a.icao.localeCompare(b.icao);
      return 0;
    });

    return result;
  }, [airports, airportMetrics, activeAircraft, whSearch, activeFilters.continent, whSort, activeFilters.semaphoreLevel]);

  // ── Paso 10: Derivar envíos reales de activeAircraft por almacén ────────
  const getWarehouseFlights = useCallback((icao) => {
    if (!activeAircraft || activeAircraft.length === 0) return { incoming: [], outgoing: [] };
    const incoming = activeAircraft.filter(f => f.to === icao && f.status !== 'cancelled').slice(0, 5);
    const outgoing = activeAircraft.filter(f => f.from === icao && f.status !== 'cancelled').slice(0, 5);
    return { incoming, outgoing };
  }, [activeAircraft]);

  return (
    <aside className="ct-panel ct-panel--entities-list" style={{ display: 'flex', flexDirection: 'column', maxHeight: '1000px', background: 'rgba(15, 23, 42, 0.9)', minWidth: "350px", flex: "1 1 350px", borderRadius: "8px", overflow: "hidden" }}>
      
      {/* HEADER TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          style={{ flex: 1, padding: '12px', background: activeTab === 'ut' ? 'rgba(96,165,250,0.2)' : 'transparent', color: activeTab === 'ut' ? '#60a5fa' : '#9ca3af', border: 'none', borderBottom: activeTab === 'ut' ? '2px solid #60a5fa' : '2px solid transparent', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => setActiveTab('ut')}
        >
          ✈️ UTs (Vuelos)
        </button>
        <button 
          style={{ flex: 1, padding: '12px', background: activeTab === 'wh' ? 'rgba(96,165,250,0.2)' : 'transparent', color: activeTab === 'wh' ? '#60a5fa' : '#9ca3af', border: 'none', borderBottom: activeTab === 'wh' ? '2px solid #60a5fa' : '2px solid transparent', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => setActiveTab('wh')}
        >
          🏭 Almacenes
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        
        {/* TAB: UTs */}
        {activeTab === 'ut' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Filtros de semáforo (igual que antes) */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {FLIGHT_STATUS_OPTIONS.map(opt => (
                    <button key={opt.value ?? 'all'} onClick={() => handleFlightStatusFilter(opt.value)}
                            style={{
                              padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold',height: '24px',
                              cursor: 'pointer', transition: 'all 0.15s',
                              border: activeFilters.flightStatus === opt.value ? `1px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                              background: activeFilters.flightStatus === opt.value ? `${opt.color}20` : 'transparent',
                              color: activeFilters.flightStatus === opt.value ? opt.color : '#64748b',
                            }}
                    >
                      {opt.label}
                    </button>
                ))}
              </div>

              {/* Inputs de búsqueda (igual que antes) */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="text" placeholder="ID..." value={utSearch} onChange={(e) => setUtSearch(e.target.value)}
                       style={{ width: '55px', height: '10px',fontSize: '11px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="Origen..." value={utSearchOrigin} onChange={(e) => setUtSearchOrigin(e.target.value)}
                       style={{ flex: 1, height: '10px',fontSize: '11px',padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="Destino..." value={utSearchDest} onChange={(e) => setUtSearchDest(e.target.value)}
                       style={{ flex: 1, height: '10px', fontSize: '11px',padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <select value={utSort} onChange={(e) => setUtSort(e.target.value)}
                        style={{ flex: 1,  height: '30px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '11px' }}
                >
                  <option value="occupancy_desc">Ocupación (Mayor a Menor)</option>
                  <option value="occupancy_asc">Ocupación (Menor a Mayor)</option>
                  <option value="dep_asc">Hora de Salida</option>
                  <option value="arr_asc">Hora de Llegada</option>
                  <option value="origin">Origen (A-Z)</option>
                  <option value="dest">Destino (A-Z)</option>
                </select>
              </div>

              {/* ── NUEVO: Panel de detalle, reemplaza la expansión inline ── */}
              {selectedFlightDetail && (
                  <FlightDetailPanel
                      flight={selectedFlightDetail}
                      onClose={() => setExpandedUt(null)}
                  />
              )}

              {/* Lista virtualizada (sin cambios) */}
              {filteredUTs.length > 0 && (
                  <List
                      height={selectedFlightDetail ? 300 : 420}
                      width="100%"
                      itemCount={filteredUTs.length}
                      itemSize={72}
                      itemData={{ flights: filteredUTs, expandedUt, setExpandedUt, handleSelectUT, focusedEntity, utRefsMap }}
                  >
                    {FlightRow}
                  </List>
              )}
              {filteredUTs.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '10px' }}>
                    No hay unidades de transporte activas.
                  </div>
              )}
            </div>
        )}

        {/* TAB: ALMACENES */}
        {activeTab === 'wh' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Paso 6: Filtros por semáforo de almacén */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {SEMAPHORE_OPTIONS.map(opt => (
                <button
                  key={opt.value ?? 'all'}
                  onClick={() => handleSemaphoreFilter(opt.value)}
                  style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold',
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: activeFilters.semaphoreLevel === opt.value ? `1px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: activeFilters.semaphoreLevel === opt.value ? `${opt.color}20` : 'transparent',
                    color: activeFilters.semaphoreLevel === opt.value ? opt.color : '#64748b',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Item 2: Filtro por continente */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[{ value: null, label: '🌎 Todos', color: '#94a3b8' },
                { value: 'america', label: '🌎 América', color: '#10b981' },
                { value: 'europe', label: '🌎 Europa', color: '#3b82f6' },
                { value: 'asia', label: '🌎 Asia', color: '#f59e0b' },
              ].map(opt => (
                <button key={opt.value ?? 'all'} onClick={() => handleContinentFilter(opt.value)}
                  style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold',
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: activeFilters.continent === opt.value ? `1px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: activeFilters.continent === opt.value ? `${opt.color}20` : 'transparent',
                    color: activeFilters.continent === opt.value ? opt.color : '#64748b',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="Buscar por código o ciudad..." 
                value={whSearch} onChange={(e) => setWhSearch(e.target.value)}
                style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '12px' }}
              />
              <select value={whSort} onChange={(e) => setWhSort(e.target.value)}
                style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="occupancy_desc">Ocupación (Mayor a Menor)</option>
                <option value="occupancy_asc">Ocupación (Menor a Mayor)</option>
                <option value="next_departure">Próxima salida de UT</option>
                <option value="next_arrival">Próxima llegada de UT</option>
                <option value="name_asc">Código (A-Z)</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredWarehouses.map(wh => {
                const metrics = airportMetrics[wh.icao] || {};
                const pct = metrics.occupancy ?? 0;
                const semaforo = getLevelColor(pct);
                const isExpanded = expandedWh === wh.icao;
                const isFocused = focusedEntity?.type === 'airport' && focusedEntity?.id === wh.icao;
                const flights = isExpanded ? getWarehouseFlights(wh.icao) : null;

                return (
                  <div
                    key={wh.icao}
                    ref={el => { whRefsMap.current[wh.icao] = el; }}
                    style={{
                      background: isFocused ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${isFocused ? '#60a5fa' : semaforo}`,
                      overflow: 'hidden',
                      transition: 'background 0.3s ease, border-color 0.3s ease',
                    }}
                  >
                    <div 
                      style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => {
                        setExpandedWh(isExpanded ? null : wh.icao);
                        // Paso 2: Panel→Mapa — enfocar en mapa
                        handleSelectWarehouse(isExpanded ? null : wh);
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#e2e8f0', fontSize: '14px', marginBottom: '2px' }}>{wh.icao}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{wh.city}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: semaforo }}>{pct.toFixed(1)}%</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{metrics.storedBags ?? 0} / {metrics.warehouseCapacity ?? 0} stock</div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Paso 10: Datos reales de vuelos, no mock */}
                        <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold' }}>📥 VUELOS ENTRANTES ({flights?.incoming?.length || 0})</div>
                        {flights?.incoming?.length > 0 ? flights.incoming.map(f => {
                          const fId = f.id?.toString().replace("vuelo-", "").split("-")[0];
                          return (
                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0', color: '#9ca3af', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); handleSelectUT(f); }}
                            >
                              <span>✈ Vuelo {fId} ({f.from})</span>
                              <span style={{ color: f.ocupacionReal > 0 ? '#10b981' : '#64748b' }}>
                                {f.ocupacionReal > 0 ? `+${f.ocupacionReal} maletas` : 'En tránsito vacío'}
                              </span>
                            </div>
                          );
                        }) : (
                          <div style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>Sin vuelos entrantes activos</div>
                        )}

                        <div style={{ fontSize: '11px', color: '#cbd5e1', margin: '12px 0 8px 0', fontWeight: 'bold' }}>📤 VUELOS SALIENTES ({flights?.outgoing?.length || 0})</div>
                        {flights?.outgoing?.length > 0 ? flights.outgoing.map(f => {
                          const fId = f.id?.toString().replace("vuelo-", "").split("-")[0];
                          return (
                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0', color: '#9ca3af', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); handleSelectUT(f); }}
                            >
                              <span>✈ Vuelo {fId} (→{f.to})</span>
                              <span style={{ color: f.ocupacionReal > 0 ? '#f59e0b' : '#64748b' }}>
                                {f.ocupacionReal > 0 ? `-${f.ocupacionReal} maletas` : 'En tránsito vacío'}
                              </span>
                            </div>
                          );
                        }) : (
                          <div style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>Sin vuelos salientes activos</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
