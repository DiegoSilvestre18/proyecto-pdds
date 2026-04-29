function FilterPreviewPanel({
  isOpen,
  filters,
  filterGroups,
  activeCount,
  onSelect,
  onClear,
  onClose,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <aside className="ct-filter-preview" aria-label="Filtros de operación (vista previa)">
      <div className="ct-filter-preview__header">
        <p>Filtros operativos</p>
        <button
          type="button"
          className="ct-filter-preview__close"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <div className="ct-filter-preview__groups">
        {filterGroups.map((group) => (
          <section key={group.key} className="ct-filter-preview__group">
            <p>{group.label}</p>
            <div className="ct-filter-preview__chips">
              {group.options.map((option) => {
                const isActive = filters[group.key] === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`ct-filter-preview__chip ${isActive ? 'ct-filter-preview__chip--active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => onSelect(group.key, option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="ct-filter-preview__footer">
        <span>{activeCount} filtros activos</span>
        <div>
          <button type="button" onClick={onClear}>Limpiar</button>
          <button type="button" className="ct-filter-preview__apply" onClick={onClose}>
            Aplicar (vista)
          </button>
        </div>
      </div>

      <p className="ct-filter-preview__hint">Vista previa sin impacto operativo</p>
    </aside>
  )
}

export default FilterPreviewPanel
