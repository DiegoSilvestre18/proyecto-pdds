import { useMemo } from 'react'

const formatDateTime = (epoch) => {
  if (!epoch) return '--'
  const d = new Date(epoch)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export default function CancelledFlightsPanel({ cancelledFlights, activeAircraft }) {
  const rescuedIds = useMemo(() => {
    if (!activeAircraft) return new Set()
    return new Set(
      activeAircraft.filter(p => p.status === 'rescued').map(p => p.id)
    )
  }, [activeAircraft])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', borderRadius: '12px',
      border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px 16px', marginTop: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#ef4444', letterSpacing: '0.5px' }}>
          🚫 REGISTRO DE CANCELACIONES
        </div>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{cancelledFlights.length} vuelo{cancelledFlights.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px', minHeight: 0 }}>
        {cancelledFlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '12px' }}>No hay vuelos cancelados</div>
        ) : (
          cancelledFlights.map(v => {
            const rescued = rescuedIds.has(v.id)
            return (
              <div key={v.cancelKey} style={{
                display: 'flex', alignItems: 'center', padding: '6px 8px',
                background: rescued ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '4px', border: rescued ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '11px', color: rescued ? '#93c5fd' : '#e2e8f0' }}>
                      Vuelo {v.id}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '11px', color: rescued ? '#93c5fd' : '#e2e8f0' }}>
                      {v.origenIcao} ➝ {v.destinoIcao}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>Vuelo: {formatDateTime(v.cancelledFlightDay)}</span>
                    <span>Cancelado: {formatDateTime(v.cancelledAt)}</span>
                  </div>
                </div>
                <div style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                  background: rescued ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: rescued ? '#60a5fa' : '#f87171',
                  border: rescued ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {rescued ? '✓ Replanif.' : 'Cancelado'}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
