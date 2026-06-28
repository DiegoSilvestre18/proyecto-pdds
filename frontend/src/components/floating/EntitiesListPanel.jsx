import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSelectionBridge } from '../../hooks/useSelectionBridge'
import { FixedSizeList as List } from 'react-window'

const statusColors = {
  critical:  '#ef4444',
  blocked:   '#f59e0b',
  rescued:   '#3b82f6',
  cancelled: '#ef4444',
  high:      '#f97316',
  normal:    '#10b981',
  default:   '#64748b',
}

const getLevelColor = (percent) => {
  if (percent >= 90) return '#ef4444'
  if (percent >= 70) return '#f59e0b'
  return '#10b981'
}

const FlightRow = React.memo(function FlightRow({ index, style, data }) {
  const { flights, expandedUt, handleSelectUT, setExpandedUt, focusedEntity, utRefsMap } = data
  const ut = flights[index]
  if (!ut) return null

  const numericId = ut.id ? ut.id.toString().replace('vuelo-', '').split('-')[0] : null
  const pct = ut.capacityPercent?.toFixed(1) || 0
  const semaforo = getLevelColor(pct)
  const isExpanded = expandedUt === ut.id
  const isFocused = focusedEntity?.type === 'flight' && focusedEntity?.id === ut.id
  const badgeColor = statusColors[ut.status] || statusColors.default

  return (
    <div className='ct-flight-row-wrap' style={style}>
      <div
        className={`ct-flight-row${isFocused ? ' ct-flight-row--focused' : ''}`}
        style={{ '--row-border': badgeColor }}
      >
        <div
          className='ct-flight-row__inner'
          onClick={() => { setExpandedUt(isExpanded ? null : ut.id); handleSelectUT(ut) }}
        >
          <div>
            <div className='ct-flight-row__meta'>
              <span className='ct-flight-row__name'>Vuelo {numericId}</span>
              <span className='ct-flight-row__badge' style={{ '--badge-bg': badgeColor }}>{ut.status}</span>
            </div>
            <div className='ct-flight-row__route'>
              <span style={{ whiteSpace: 'nowrap' }}>{ut.from}</span>
              <span>➔</span>
              <span className='ct-flight-row__to'>{ut.to}</span>
            </div>
          </div>
          <div className='ct-flight-row__stats'>
            <div className='ct-flight-row__pct' style={{ '--row-color': semaforo }}>{pct}%</div>
            <div className='ct-flight-row__bags'>{ut.ocupacionReal || 0} / {ut.capacidadMax || 0} maletas</div>
          </div>
        </div>
      </div>
    </div>
  )
}, (prev, next) => {
  const a = prev.data.flights[prev.index]
  const b = next.data.flights[next.index]
  return a?.id === b?.id
    && a?.status === b?.status
    && a?.capacityPercent === b?.capacityPercent
    && a?.ocupacionReal === b?.ocupacionReal
    && prev.data.expandedUt === next.data.expandedUt
    && prev.data.focusedEntity?.id === next.data.focusedEntity?.id
})

function FlightDetailPanel({ flight, onClose }) {
  if (!flight) return null

  const numericId = flight.id ? flight.id.toString().replace('vuelo-', '').split('-')[0] : null
  const statusColor = statusColors[flight.status] || statusColors.default
  const progress = ((flight.progress ?? 0) * 100).toFixed(0)

  return (
    <div className='ct-flight-detail-view' role='region' aria-label='Detalle de vuelo'>
      <div className='ct-flight-detail-view__header'>
        <button className='ct-flight-detail-view__back' onClick={onClose}>← Volver</button>
        <span className='ct-flight-detail-view__status' style={{ color: statusColor, borderColor: statusColor }}>
          {flight.status}
        </span>
      </div>

      <div className='ct-flight-detail-view__route'>
        <span className='ct-flight-detail-view__flight-id'>✈ Vuelo {numericId}</span>
        <div>
          <span className='ct-flight-detail-view__airport'>{flight.from}</span>
          <span className='ct-flight-detail-view__arrow'>➔</span>
          <span className='ct-flight-detail-view__airport'>{flight.to}</span>
        </div>
      </div>

      <div className='ct-flight-detail-view__metrics'>
        <div className='ct-flight-detail-card'>
          <span className='ct-flight-detail-card__label'>Ocupación Real</span>
          <strong className='ct-flight-detail-card__value'>{flight.ocupacionReal || 0} maletas</strong>
        </div>
        <div className='ct-flight-detail-card'>
          <span className='ct-flight-detail-card__label'>Capacidad Máxima</span>
          <strong className='ct-flight-detail-card__value'>{flight.capacidadMax || 0} maletas</strong>
        </div>
      </div>

      <div className='ct-flight-detail__progress'>
        <div className='ct-flight-detail__progress-header'>
          <span>Progreso</span>
          <span className='ct-flight-detail__progress-pct'>{progress}%</span>
        </div>
        <div className='ct-flight-detail__progress-track'>
          <div className='ct-flight-detail__progress-fill' style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

const getLevelName = (percent) => {
  if (percent >= 90) return 'red'
  if (percent >= 70) return 'amber'
  return 'green'
}

const SEMAPHORE_OPTIONS = [
  { value: null,    label: '⬜ Todos',   color: '#94a3b8' },
  { value: 'green', label: '🟢 Estable', color: '#10b981' },
  { value: 'amber', label: '🟡 Media',   color: '#f59e0b' },
  { value: 'red',   label: '🔴 Crítico', color: '#ef4444' },
]

const FLIGHT_STATUS_OPTIONS = [
  { value: null,        label: '⬜ Todos',           color: '#94a3b8' },
  { value: 'normal',    label: '🟢 Baja ocupación',  color: '#10b981' },
  { value: 'critical',  label: '🟡 Ocupación media', color: '#f59e0b' },
  { value: 'cancelled', label: '🔴 Alta ocupación',  color: '#ef4444' },
]

const CONTINENT_OPTIONS = [
  { value: null,      label: '🌎 Todos',   color: '#94a3b8' },
  { value: 'america', label: '🌎 América', color: '#10b981' },
  { value: 'europe',  label: '🌎 Europa',  color: '#3b82f6' },
  { value: 'asia',    label: '🌎 Asia',    color: '#f59e0b' },
]

export default function EntitiesListPanel({ activeAircraft, airports, airportMetrics, onSelectFlight, onAirportSelect }) {
  const [activeTab, setActiveTab] = useState('wh')
  const [utSearch, setUtSearch] = useState('')
  const [utSearchOrigin, setUtSearchOrigin] = useState('')
  const [utSearchDest, setUtSearchDest] = useState('')
  const [utSort, setUtSort] = useState('occupancy_desc')
  const [expandedUt, setExpandedUt] = useState(null)

  const [whSearch, setWhSearch] = useState('')
  const [whSort, setWhSort] = useState('occupancy_desc')
  const [expandedWh, setExpandedWh] = useState(null)
  const [whShowAllFlights, setWhShowAllFlights] = useState({})

  const listContainerRef = useRef(null)
  const [listHeight, setListHeight] = useState(0)

  useEffect(() => {
    if (!listContainerRef.current) return

    const updateHeight = () => {
      const rect = listContainerRef.current.getBoundingClientRect()
      setListHeight(rect.height)
    }

    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(listContainerRef.current)

    return () => ro.disconnect()
  }, [activeTab])

  const {
    focusedEntity,
    setFocusedEntity,
    clearFocusedEntity,
    dispatchMapCommand,
    activeFilters,
    setActiveFilters,
  } = useSelectionBridge()

  const utRefsMap = useRef({})
  const whRefsMap = useRef({})
  const scrollContainerRef = useRef(null)
  const lastMapSelectionRef = useRef(null)

  useEffect(() => {
    if (!focusedEntity || focusedEntity.source !== 'map') return

    if (focusedEntity.type === 'flight') {
      setActiveTab('ut')
      setExpandedUt(focusedEntity.id)
      lastMapSelectionRef.current = { type: 'flight', id: focusedEntity.id }
    }

    if (focusedEntity.type === 'airport') {
      setActiveTab('wh')
      setExpandedWh(focusedEntity.id)
      lastMapSelectionRef.current = { type: 'airport', id: focusedEntity.id }
    }
  }, [focusedEntity])

  useEffect(() => {
    const last = lastMapSelectionRef.current
    if (!last) return

    const refMap = last.type === 'flight' ? utRefsMap : whRefsMap
    const ref = refMap.current[last.id]

    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ref.classList.add('ct-entity-highlighted')
      setTimeout(() => ref.classList.remove('ct-entity-highlighted'), 2500)
      lastMapSelectionRef.current = null
    }
  }, [activeTab, expandedWh, expandedUt])

  const handleSelectUT = useCallback((ut) => {
    setFocusedEntity('flight', ut.id, 'panel')
    if (onSelectFlight) onSelectFlight(ut.id)
  }, [setFocusedEntity, onSelectFlight])

  const handleSelectWarehouse = useCallback((wh) => {
    if (!wh) {
      clearFocusedEntity()
      if (onAirportSelect) onAirportSelect(null)
      return
    }
    setFocusedEntity('airport', wh.icao, 'panel')
    if (onAirportSelect) onAirportSelect(wh.icao)
    // Guard: sin coordenadas válidas no se despacha flyTo (evita centrar en undefined).
    if (Array.isArray(wh.coordinates) && wh.coordinates.length === 2) {
      dispatchMapCommand('flyTo', {
        coordinates: wh.coordinates,
        zoom: 3,
        targetId: wh.icao,
      })
    }
  }, [setFocusedEntity, clearFocusedEntity, dispatchMapCommand, onAirportSelect])

  const handleSemaphoreFilter = useCallback((level) => {
    setActiveFilters(prev => ({ ...prev, semaphoreLevel: level }))
  }, [setActiveFilters])

  const handleFlightStatusFilter = useCallback((status) => {
    setActiveFilters(prev => ({ ...prev, flightStatus: status }))
  }, [setActiveFilters])

  const handleContinentFilter = useCallback((continent) => {
    setActiveFilters(prev => ({ ...prev, continent }))
  }, [setActiveFilters])

  const filteredUTs = useMemo(() => {
    if (activeTab !== 'ut') return []
    let result = [...(activeAircraft || [])]

    if (utSearch) {
      const q = utSearch.toLowerCase()
      result = result.filter(ut => ut.id?.toLowerCase().includes(q))
    }

    if (utSearchOrigin) {
      const q = utSearchOrigin.toLowerCase()
      result = result.filter(ut => ut.from?.toLowerCase().includes(q))
    }

    if (utSearchDest) {
      const q = utSearchDest.toLowerCase()
      result = result.filter(ut => ut.to?.toLowerCase().includes(q))
    }

    if (activeFilters.flightStatus) {
      result = result.filter(ut => ut.status === activeFilters.flightStatus)
    }

    result.sort((a, b) => {
      if (utSort === 'occupancy_desc') return (b.capacityPercent || 0) - (a.capacityPercent || 0)
      if (utSort === 'occupancy_asc') return (a.capacityPercent || 0) - (b.capacityPercent || 0)
      if (utSort === 'dep_asc') return (a.departureTime || 0) - (b.departureTime || 0)
      if (utSort === 'arr_asc') return (a.arrivalTime || 0) - (b.arrivalTime || 0)
      if (utSort === 'origin') return (a.from || '').localeCompare(b.from || '')
      if (utSort === 'dest') return (a.to || '').localeCompare(b.to || '')
      return 0
    })

    return result
  }, [activeAircraft, utSearch, utSearchOrigin, utSearchDest, utSort, activeFilters.flightStatus])

  const selectedFlightDetail = useMemo(() => {
    if (!expandedUt) return null
    return (activeAircraft || []).find(ut => ut.id === expandedUt) || null
  }, [expandedUt, activeAircraft])

  const filteredWarehouses = useMemo(() => {
    if (activeTab !== 'wh') return []
    let result = [...(airports || [])]

    if (whSearch) {
      const q = whSearch.toLowerCase()
      result = result.filter(wh =>
        wh.icao?.toLowerCase().includes(q) ||
        wh.city?.toLowerCase().includes(q)
      )
    }

    if (activeFilters.semaphoreLevel) {
      result = result.filter(wh => {
        const m = airportMetrics[wh.icao] || {}
        const pct = m.occupancy ?? 0
        return getLevelName(pct) === activeFilters.semaphoreLevel
      })
    }

    if (activeFilters.continent) {
      result = result.filter(wh => wh.continent === activeFilters.continent)
    }

    const nearestDep = {}
    const nearestArr = {}
    ;(activeAircraft || []).forEach(f => {
      if (f.from) nearestDep[f.from] = Math.min(nearestDep[f.from] ?? Infinity, f.departureTime ?? Infinity)
      if (f.to) nearestArr[f.to] = Math.min(nearestArr[f.to] ?? Infinity, f.arrivalTime ?? Infinity)
    })

    result.sort((a, b) => {
      const mA = airportMetrics[a.icao] || {}
      const mB = airportMetrics[b.icao] || {}
      const pctA = mA.occupancy ?? 0
      const pctB = mB.occupancy ?? 0

      if (whSort === 'occupancy_desc') return pctB - pctA
      if (whSort === 'occupancy_asc') return pctA - pctB
      if (whSort === 'next_departure') return (nearestDep[a.icao] ?? Infinity) - (nearestDep[b.icao] ?? Infinity)
      if (whSort === 'next_arrival') return (nearestArr[a.icao] ?? Infinity) - (nearestArr[b.icao] ?? Infinity)
      if (whSort === 'name_asc') return a.icao.localeCompare(b.icao)
      return 0
    })

    return result
  }, [airports, airportMetrics, activeAircraft, whSearch, activeFilters.continent, whSort, activeFilters.semaphoreLevel])

  const getWarehouseFlights = useCallback((icao, showAll) => {
    if (!activeAircraft || activeAircraft.length === 0) return { incoming: [], outgoing: [] }
    const limit = showAll ? Infinity : 5
    const incoming = activeAircraft.filter(f => f.to === icao && f.status !== 'cancelled').slice(0, limit)
    const outgoing = activeAircraft.filter(f => f.from === icao && f.status !== 'cancelled').slice(0, limit)
    const totalIncoming = activeAircraft.filter(f => f.to === icao && f.status !== 'cancelled').length
    const totalOutgoing = activeAircraft.filter(f => f.from === icao && f.status !== 'cancelled').length
    return { incoming, outgoing, totalIncoming, totalOutgoing }
  }, [activeAircraft])

  return (
    <aside className='ct-panel ct-panel--entities-list'>

      {/* HEADER TABS */}
      <div className='ct-entities-tabs'>
        <button
          className={`ct-entities-tab${activeTab === 'ut' ? ' ct-entities-tab--active' : ''}`}
          onClick={() => setActiveTab('ut')}
        >
          ✈ UTs (Vuelos)
        </button>
        <button
          className={`ct-entities-tab${activeTab === 'wh' ? ' ct-entities-tab--active' : ''}`}
          onClick={() => setActiveTab('wh')}
        >
          🏢 Almacenes
        </button>
      </div>

      <div className={`ct-entities-body${activeTab === 'wh' ? ' ct-entities-body--scroll' : ''}`}>

        {/* TAB: UTs */}
        {activeTab === 'ut' && (
          <>
            {selectedFlightDetail ? (
              <FlightDetailPanel
                flight={selectedFlightDetail}
                onClose={() => setExpandedUt(null)}
              />
            ) : (
              <>
                <div className='ct-filter-chips'>
                  {FLIGHT_STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value ?? 'all'}
                      onClick={() => handleFlightStatusFilter(opt.value)}
                      className={`ct-filter-chip${activeFilters.flightStatus === opt.value ? ' ct-filter-chip--active' : ''}`}
                      style={{ '--chip-color': opt.color }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className='ct-search-row'>
                  <input type='text' placeholder='ID...' value={utSearch} onChange={(e) => setUtSearch(e.target.value)}
                    className='ct-search-input ct-search-input--narrow' />
                  <input type='text' placeholder='Origen...' value={utSearchOrigin} onChange={(e) => setUtSearchOrigin(e.target.value)}
                    className='ct-search-input' />
                  <input type='text' placeholder='Destino...' value={utSearchDest} onChange={(e) => setUtSearchDest(e.target.value)}
                    className='ct-search-input' />
                </div>
                <div className='ct-search-row'>
                  <select value={utSort} onChange={(e) => setUtSort(e.target.value)} className='ct-select'>
                    <option value='occupancy_desc'>Ocupación (Mayor a Menor)</option>
                    <option value='occupancy_asc'>Ocupación (Menor a Mayor)</option>
                    <option value='dep_asc'>Hora de Salida</option>
                    <option value='arr_asc'>Hora de Llegada</option>
                    <option value='origin'>Origen (A-Z)</option>
                    <option value='dest'>Destino (A-Z)</option>
                  </select>
                </div>

                {filteredUTs.length > 0 && (
                  <List
                    height={Math.max(filteredUTs.length * 54, 54)}
                    width='100%'
                    itemCount={filteredUTs.length}
                    itemSize={54}
                    style={{ overflow: 'hidden' }}
                    itemData={{ flights: filteredUTs, expandedUt, setExpandedUt, handleSelectUT, focusedEntity, utRefsMap }}
                  >
                    {FlightRow}
                  </List>
                )}
                {filteredUTs.length === 0 && (
                  <div className='ct-entities-empty'>No hay unidades de transporte activas.</div>
                )}
              </>
            )}
          </>
        )}

        {/* TAB: ALMACENES */}
        {activeTab === 'wh' && (
          <>
            <div className='ct-filter-chips'>
              {SEMAPHORE_OPTIONS.map(opt => (
                <button
                  key={opt.value ?? 'all'}
                  onClick={() => handleSemaphoreFilter(opt.value)}
                  className={`ct-filter-chip ct-filter-chip--round${activeFilters.semaphoreLevel === opt.value ? ' ct-filter-chip--active' : ''}`}
                  style={{ '--chip-color': opt.color }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className='ct-filter-chips'>
              {CONTINENT_OPTIONS.map(opt => (
                <button
                  key={opt.value ?? 'all'}
                  onClick={() => handleContinentFilter(opt.value)}
                  className={`ct-filter-chip ct-filter-chip--round${activeFilters.continent === opt.value ? ' ct-filter-chip--active' : ''}`}
                  style={{ '--chip-color': opt.color }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className='ct-search-row'>
              <input type='text' placeholder='Buscar por código o ciudad...'
                value={whSearch} onChange={(e) => setWhSearch(e.target.value)}
                className='ct-search-input' />
              <select value={whSort} onChange={(e) => setWhSort(e.target.value)} className='ct-select'>
                <option value='occupancy_desc'>Ocupación (Mayor a Menor)</option>
                <option value='occupancy_asc'>Ocupación (Menor a Mayor)</option>
                <option value='next_departure'>Próxima salida de UT</option>
                <option value='next_arrival'>Próxima llegada de UT</option>
                <option value='name_asc'>Código (A-Z)</option>
              </select>
            </div>

            <div className='ct-wh-list'>
              {filteredWarehouses.map(wh => {
                const metrics = airportMetrics[wh.icao] || {}
                const pct = metrics.occupancy ?? 0
                const semaforo = getLevelColor(pct)
                const isExpanded = expandedWh === wh.icao
                const isFocused = focusedEntity?.type === 'airport' && focusedEntity?.id === wh.icao
                const showAllWh = whShowAllFlights[wh.icao]
                const flights = isExpanded ? getWarehouseFlights(wh.icao, showAllWh) : null

                return (
                  <div
                    key={wh.icao}
                    ref={el => { whRefsMap.current[wh.icao] = el }}
                    className={`ct-wh-item${isFocused ? ' ct-wh-item--focused' : ''}`}
                    style={{ '--wh-color': semaforo }}
                  >
                    <div
                      className='ct-wh-row'
                      onClick={() => {
                        setExpandedWh(isExpanded ? null : wh.icao)
                        handleSelectWarehouse(isExpanded ? null : wh)
                      }}
                    >
                      <div>
                        <div className='ct-wh-row__name'>{wh.icao}</div>
                        <div className='ct-wh-row__city'>{wh.city}</div>
                      </div>
                      <div>
                        <div className='ct-wh-row__pct'>{pct.toFixed(1)}%</div>
                        <div className='ct-wh-row__bags'>{metrics.storedBags ?? 0} / {metrics.warehouseCapacity ?? 0} stock</div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className='ct-wh-expand'>
                        <div className='ct-wh-expand__title'>📥 Vuelos entrantes ({flights?.incoming?.length || 0})</div>
                        {flights?.incoming?.length > 0 ? (
                          <>
                            {flights.incoming.map(f => {
                              const fId = f.id?.toString().replace('vuelo-', '').split('-')[0]
                              return (
                                <div key={f.id} className='ct-wh-flight-row'
                                  onClick={(e) => { e.stopPropagation(); handleSelectUT(f) }}
                                >
                                  <span>✈ Vuelo {fId} ({f.from})</span>
                                  <span className='ct-wh-flight-badge' style={{ '--badge-color': f.ocupacionReal > 0 ? '#10b981' : '#64748b' }}>
                                    {f.ocupacionReal > 0 ? `+${f.ocupacionReal} maletas` : 'En tránsito vacío'}
                                  </span>
                                </div>
                              )
                            })}
                            {flights.totalIncoming > 5 && (
                              <button className='ct-wh-show-more' onClick={(e) => { e.stopPropagation(); setWhShowAllFlights(prev => ({ ...prev, [wh.icao]: !showAllWh })) }}>
                                {showAllWh ? '▲ Mostrar menos' : `▼ Mostrar más (${flights.totalIncoming - 5} más)`}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className='ct-wh-empty'>Sin vuelos entrantes activos</div>
                        )}

                        <div className='ct-wh-expand__title ct-wh-expand__title--spaced'>📤 Vuelos salientes ({flights?.outgoing?.length || 0})</div>
                        {flights?.outgoing?.length > 0 ? (
                          <>
                            {flights.outgoing.map(f => {
                              const fId = f.id?.toString().replace('vuelo-', '').split('-')[0]
                              return (
                                <div key={f.id} className='ct-wh-flight-row'
                                  onClick={(e) => { e.stopPropagation(); handleSelectUT(f) }}
                                >
                                  <span>✈ Vuelo {fId} (→{f.to})</span>
                                  <span className='ct-wh-flight-badge' style={{ '--badge-color': f.ocupacionReal > 0 ? '#f59e0b' : '#64748b' }}>
                                    {f.ocupacionReal > 0 ? `-${f.ocupacionReal} maletas` : 'En tránsito vacío'}
                                  </span>
                                </div>
                              )
                            })}
                            {flights.totalOutgoing > 5 && (
                              <button className='ct-wh-show-more' onClick={(e) => { e.stopPropagation(); setWhShowAllFlights(prev => ({ ...prev, [wh.icao]: !showAllWh })) }}>
                                {showAllWh ? '▲ Mostrar menos' : `▼ Mostrar más (${flights.totalOutgoing - 5} más)`}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className='ct-wh-empty'>Sin vuelos salientes activos</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>
    </aside>
  )
}
