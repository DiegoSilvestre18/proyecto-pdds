import { useState, useEffect } from 'react'

const STATUS_LABELS = {
  normal:    'En tránsito',
  high:      'Carga alta',
  critical:  'Crítico',
  blocked:   'Bloqueado',
  rescued:   'Rescatado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS = {
  normal:    '#10b981',
  high:      '#f59e0b',
  critical:  '#ef4444',
  blocked:   '#ef4444',
  rescued:   '#a78bfa',
  cancelled: '#64748b',
}

function formatFlightId(id) {
  if (!id) return '--'
  const parts = id.split('-')
  if (parts.length >= 2) return `${parts[0].toUpperCase()}-${parts[1]}`
  return id
}

function formatTimeWithGMT(epoch, gmtOffset) {
  if (!epoch) return '--'
  // Computa el epoch en la zona horaria destino sin mutar el objeto Date.
  // Se desplaza el epoch por el offset y se formatea como UTC, de modo que los
  // números mostrados corresponden a la hora local del aeropuerto.
  const offset = gmtOffset ?? 0
  const localEpoch = epoch + offset * 3600000
  const timeStr = new Date(localEpoch).toLocaleString('es-ES', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC',
  })
  const gmtLabel = `GMT${offset >= 0 ? '+' : ''}${offset}`
  return `${timeStr} ${gmtLabel}`
}

function ShipmentDetailPanel({ isVisible, selectedAircraft = null }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(false)
  }, [selectedAircraft?.id])

  if (!isVisible || !selectedAircraft) return null

  const statusLabel    = STATUS_LABELS[selectedAircraft.status] ?? selectedAircraft.status ?? 'En vuelo'
  const statusColor    = STATUS_COLORS[selectedAircraft.status] ?? '#60a5fa'
  const depTime        = formatTimeWithGMT(selectedAircraft.departureTime, selectedAircraft.fromGmt)
  const arrTime        = formatTimeWithGMT(selectedAircraft.arrivalTime,   selectedAircraft.toGmt)
  const progressPct    = Math.min(100, Math.max(0, Math.round((selectedAircraft.progress ?? 0) * 100)))
  const ocupacion      = selectedAircraft.ocupacionReal ?? 0
  const capacidad      = selectedAircraft.capacidadMax  ?? 1
  const capacidadPct   = Math.min(100, Math.round((ocupacion / capacidad) * 100))
  const capacidadColor = ocupacion >= capacidad ? '#ef4444' : capacidadPct > 80 ? '#f59e0b' : '#10b981'
  const flightId       = formatFlightId(selectedAircraft.id)

  return (
    <aside
      className='ct-panel ct-panel--shipment'
      aria-label='Detalle de Vuelo'
      style={{ '--panel-border-color': collapsed ? undefined : 'rgba(56,189,248,0.35)' }}
    >
      {/* ── Pill comprimida ──────────────────────────────────────── */}
      <button
        className='ct-pill'
        onClick={() => setCollapsed(p => !p)}
        aria-expanded={!collapsed}
        aria-controls='ct-shipment-expand'
        aria-label={`Detalle de vuelo ${flightId}, ${collapsed ? 'expandir' : 'contraer'}`}
      >
        <span className='ct-pill__dot' style={{ '--dot-color': statusColor }} />
        <span className='ct-pill__id'>{flightId}</span>
        <span className='ct-pill__route'>{selectedAircraft.from} → {selectedAircraft.to}</span>
        <div className='ct-pill__bar'>
          <div className='ct-pill__bar-fill' style={{ width: `${progressPct}%` }} />
        </div>
        <span className={`ct-pill__chevron${collapsed ? '' : ' ct-pill__chevron--open'}`} aria-hidden="true">▲</span>
      </button>

      {/* ── Panel expandido ──────────────────────────────────────── */}
      <div id='ct-shipment-expand' className={`ct-expand${collapsed ? '' : ' ct-expand--open'}`}>
        <div className='ct-expand__body'>

          {/* Ruta + tiempos */}
          <div className='ct-flight-route'>
            <div className='ct-flight-route__col'>
              <span className='ct-flight-route__label'>Salida</span>
              <strong className='ct-flight-route__code'>{selectedAircraft.from}</strong>
              <span className='ct-flight-route__time'>{depTime}</span>
            </div>
            <div className='ct-flight-route__col ct-flight-route__col--right'>
              <span className='ct-flight-route__label'>Llegada</span>
              <strong className='ct-flight-route__code'>{selectedAircraft.to}</strong>
              <span className='ct-flight-route__time'>{arrTime}</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className='ct-bar'>
            <div className='ct-bar__fill' style={{ width: `${progressPct}%`, '--bar-color': '#38bdf8' }} />
            <span className='ct-bar__plane' style={{ left: `${progressPct}%` }}>✈</span>
          </div>
          <p className='ct-bar-label'>{progressPct}% COMPLETADO</p>

          {/* Estado + Maletas */}
          <div className='ct-data-grid'>
            <div className='ct-data-card'>
              <p className='ct-data-card__label'>Estado</p>
              <strong className='ct-data-card__value' style={{ '--value-color': statusColor }}>{statusLabel}</strong>
            </div>
            <div className='ct-data-card'>
              <p className='ct-data-card__label'>Maletas</p>
              <strong className='ct-data-card__value' style={{ '--value-color': capacidadColor }}>{ocupacion} / {capacidad}</strong>
            </div>
          </div>

          {/* Barra de ocupación */}
          <div className='ct-occ-header' style={{ '--bar-color': capacidadColor }}>
            <span>OCUPACIÓN</span>
            <span className='ct-occ-header__pct'>{capacidadPct}%</span>
          </div>
          <div className='ct-bar'>
            <div className='ct-bar__fill' style={{ width: `${capacidadPct}%`, '--bar-color': capacidadColor }} />
          </div>

        </div>
      </div>
    </aside>
  )
}

export default ShipmentDetailPanel
