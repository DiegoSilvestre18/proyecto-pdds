function SimulationControls({
  isVisible,
  simState,
  simulatedClock,
  elapsedReal,
}) {
  if (!isVisible) {
    return null
  }

  return (
    <div className="ct-sim-controls" aria-label="Controles de simulación">




      <div className="ct-sim-controls__clocks">
        <div className="ct-sim-clock-item">
          <span className="ct-sim-label">Hora Operativa</span>
          <strong>{simulatedClock}</strong>
        </div>
        <div className="ct-sim-clock-item">
          <span className="ct-sim-label">Tiempo real</span>
          <strong>{elapsedReal}</strong>
        </div>
      </div>

      <div className="ct-sim-controls__status">
        <span className={`ct-sim-status-badge ct-sim-status-badge--${simState}`} role="status">
          {{
            idle: '⏹ Listo',
            running: '▶ En ejecución',
            paused: '⏸ Pausado',
            completed: '✓ Completado',
            collapsed: '⚠ Colapsado'
          }[simState] || '• Desconocido'}
        </span>
      </div>
    </div>
  )
}

export default SimulationControls
