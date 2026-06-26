import { useState, useEffect } from 'react'

const STATUS_LABELS = {
  normal:   'Operación Normal',
  high:     'Carga Alta',
  critical: 'Estado Crítico',
}

const STATUS_COLORS = {
  normal:   '#a7f3d0',
  high:     '#fbbf24',
  critical: '#ef4444',
}

function AirportDetailPanel({ isVisible, selectedAirport = null, metrics = null, currentEpochTime = 0 }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(false)
  }, [selectedAirport?.icao])

  if (!isVisible || !selectedAirport) return null

  const { id, icao, name, city, country, continent, gmtOffset } = selectedAirport

  const code      = icao || id || '---'
  const stockBags = metrics?.storedBags ?? metrics?.load ?? 0
  const maxCap    = metrics?.warehouseCapacity ?? metrics?.capacity ?? 0
  const status    = metrics?.level ?? 'normal'

  const statusLabel = STATUS_LABELS[status] ?? 'Operación Normal'
  const color       = STATUS_COLORS[status] ?? STATUS_COLORS.normal

  const pct   = maxCap > 0 ? Math.min(100, Math.round((stockBags / maxCap) * 100)) : 0
  const isFull = pct >= 100

  const localEpoch  = currentEpochTime + ((gmtOffset || 0) * 3600000)
  const localTimeStr = currentEpochTime > 0
    ? new Date(localEpoch).toLocaleString('es-ES', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '--'

  const continentMap = { america: 'América', europe: 'Europa', asia: 'Asia' }
  const contName     = continentMap[continent?.toLowerCase()] || continent

  const formattedGmtDiff = gmtOffset > 0 ? `+${gmtOffset} horas` : `${gmtOffset} horas`

  return (
    <aside
      className='ct-panel ct-panel--airport'
      aria-label='Detalle de Almacén'
      style={{ '--status-color': color, '--bag-color': isFull ? '#ef4444' : 'white' }}
    >
      {/* Pill comprimida — siempre visible */}
      <button className='ct-pill' onClick={() => setCollapsed(p => !p)}>
        <span className='ct-pill__dot' style={{ '--dot-color': color }} />
        <span className='ct-pill__id'>{code}</span>
        <span className='ct-pill__route'>{city || name || code}</span>
        <div className='ct-pill__bar'>
          <div className='ct-pill__bar-fill' style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className={`ct-pill__chevron${collapsed ? '' : ' ct-pill__chevron--open'}`}>▲</span>
      </button>

      {/* Panel expandido */}
      <div className={`ct-expand${collapsed ? '' : ' ct-expand--open'}`}>
        <div className='ct-airport-expand__body'>
          <div className='ct-airport-header'>
            <div>
              <span className='ct-airport-header__label'>🏢 Almacén Seleccionado</span>
              <strong className='ct-airport-header__code'>{code}</strong>
              <div className='ct-airport-header__name'>{name || `${city || ''}, ${country || ''}`}</div>
              {contName && <div className='ct-airport-header__continent'>Continente: {contName}</div>}
            </div>
            <div className='ct-airport-clock'>
              <div className='ct-airport-clock__label'>Hora Local</div>
              <div className='ct-airport-clock__time'>{localTimeStr}</div>
              <div className='ct-airport-clock__diff'>
                Diferencia UTC: <span>{formattedGmtDiff}</span>
              </div>
            </div>
          </div>

          <div className='ct-capacity-block'>
            <div className='ct-capacity-block__header'>
              <span className='ct-capacity-block__title'>Estado de capacidad</span>
              <strong className='ct-capacity-block__status'>{statusLabel}</strong>
            </div>
            <div className='ct-capacity-bar'>
              <div className='ct-capacity-bar__fill' style={{ width: `${pct}%` }} />
            </div>
            <div className='ct-capacity-footer'>
              <span className='ct-capacity-footer__pct'>{pct}% ocupado</span>
              <strong className='ct-capacity-footer__bags'>{stockBags ?? 0} / {maxCap || '?'} maletas</strong>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default AirportDetailPanel
