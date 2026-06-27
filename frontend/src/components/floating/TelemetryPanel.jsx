// Etiqueta de estado: no depender solo del color (WCAG 1.4.1).
const STATUS_META = {
  danger:  { icon: '⛔', text: 'Crítico', color: '#ef4444' },
  warning: { icon: '⚠️', text: 'Alerta', color: '#f59e0b' },
  default: { icon: '✓', text: 'Normal', color: '#38bdf8' },
}

function TelemetryPanel({ isVisible, summary, elapsedOperationTime, kpis, onHide }) {
  if (!isVisible) {
    return null
  }

  return (
    <>
      <aside className="ct-panel ct-panel--telemetry telemetry-scroll" style={{ 
        maxWidth: '600px',
        overflowX: 'hidden', 
        overflowY: 'auto',
        backdropFilter: 'blur(12px)', 
        background: 'rgba(15, 23, 42, 0.85)', 
        padding: 0 
      }}>
      <div className="ct-panel-header" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)' }}>
        <p style={{ fontWeight: 'bold', color: '#e2e8f0', margin: 0, fontSize: '12px' }}>TELEMETRÍA EN TIEMPO REAL</p>
      </div>

      {/* BLOQUE A: KPIs Principales (Antiguo KpiStrip) */}
      {kpis && kpis.length > 0 && (
        <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h4 style={{ margin: 0, fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>MÉTRICAS GLOBALES</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }} aria-live="polite">
              {kpis.map((kpi, idx) => {
                const meta = STATUS_META[kpi.status] || STATUS_META.default
                const showBadge = kpi.status === 'danger' || kpi.status === 'warning'
                return (
                <div key={kpi.key || idx} style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.title}</span>
                    <strong style={{ fontSize: '13px', color: meta.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {showBadge && <span title={meta.text} aria-label={meta.text}>{meta.icon}</span>}
                      {kpi.value}
                    </strong>
                </div>
              )})}
            </div>
        </div>
      )}

      {/* BLOQUE B: Telemetría Técnica original */}
      <div style={{ padding: '6px 10px' }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>DATOS OPERATIVOS</h4>
        <div className="ct-metrics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>USO ALMACENES</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.storageOccupancy.value}%</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>VUELOS EN CURSO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.flightsInCourse.value}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>HORA INICIO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.operationStart}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>TRANSCURRIDO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{elapsedOperationTime}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>FASE DE SIMULACIÓN</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.progress.label}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>ESCENARIO ACTIVO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.scenarioLabel}</strong>
          </div>
        </div>
      </div>

      <div className="ct-average" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '6px 10px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>OCUPACIÓN PROMEDIO</span>
        <strong style={{ color: '#38bdf8' }}>{summary.storageOccupancy.value}%</strong>
      </div>
    </aside>
    </>
  )
}

export default TelemetryPanel
