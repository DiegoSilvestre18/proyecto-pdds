function TelemetryPanel({ isVisible, summary, elapsedOperationTime, kpis, onHide }) {
  if (!isVisible) {
    return null
  }

  return (
    <>
      <style>{`
        .telemetry-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .telemetry-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .telemetry-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }
        .telemetry-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
      <aside className="ct-panel ct-panel--telemetry telemetry-scroll" style={{ 
        width: '440px', 
        maxWidth: '90vw',
        maxHeight: '75vh',
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
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>MÉTRICAS GLOBALES</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {kpis.map((kpi, idx) => (
                <div key={kpi.key || idx} style={{ 
                  background: 'rgba(30, 41, 59, 0.5)', 
                  padding: '6px 8px', 
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.title}</span>
                  <strong style={{ fontSize: '15px', color: kpi.status === 'danger' ? '#ef4444' : kpi.status === 'warning' ? '#f59e0b' : '#38bdf8' }}>{kpi.value}</strong>
                  {kpi.subtitle && <span style={{ fontSize: '9px', color: '#64748b' }}>{kpi.subtitle}</span>}
                </div>
              ))}
            </div>
        </div>
      )}

      {/* BLOQUE B: Telemetría Técnica original */}
      <div style={{ padding: '10px 12px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>DATOS OPERATIVOS</h4>
        <div className="ct-metrics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>USO ALMACENES</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.storageOccupancy.value}%</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>VUELOS EN CURSO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.flightsInCourse.value}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>HORA INICIO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.operationStart}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>TRANSCURRIDO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{elapsedOperationTime}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>FASE DE SIMULACIÓN</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.progress.label}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>ESCENARIO ACTIVO</span>
            <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>{summary.scenarioLabel}</strong>
          </div>
        </div>
      </div>

      <div className="ct-average" style={{ background: 'rgba(15, 23, 42, 0.6)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>OCUPACIÓN PROMEDIO</span>
        <strong style={{ color: '#38bdf8' }}>{summary.storageOccupancy.value}%</strong>
      </div>
    </aside>
    </>
  )
}

export default TelemetryPanel
