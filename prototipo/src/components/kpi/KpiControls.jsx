function KpiControls({ isCollapsed, onToggle }) {
  return (
    <div
      className={`ct-kpi-controls ${
        isCollapsed ? 'ct-kpi-controls--collapsed' : 'ct-kpi-controls--expanded'
      }`}
      aria-label="Controles de resumen"
    >
      <button
        type="button"
        className="ct-kpi-controls-btn"
        aria-expanded={!isCollapsed}
        onClick={onToggle}
      >
        {isCollapsed ? 'Mostrar resumen' : 'Ocultar resumen'}
      </button>
    </div>
  )
}

export default KpiControls
