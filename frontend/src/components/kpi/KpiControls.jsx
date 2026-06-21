function KpiControls({ isCollapsed, onToggle }) {
  return (
    <button
      type="button"
      className="ct-kpi-pull-tab"
      aria-expanded={!isCollapsed}
      onClick={onToggle}
      title={isCollapsed ? 'Mostrar KPIs' : 'Ocultar KPIs'}
    >
      {isCollapsed ? '▼ Mostrar Resumen' : '▲ Ocultar Resumen'}
    </button>
  )
}

export default KpiControls
