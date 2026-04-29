import { FiX } from 'react-icons/fi'

function CapacityLegendPanel({ isVisible, onHide }) {
  if (!isVisible) {
    return null
  }

  return (
    <aside className="ct-map-legend" aria-label="Semáforo de capacidad">
      <div className="ct-map-legend-header">
        <p>Semáforo de capacidad de almacén</p>
        <button
          type="button"
          className="ct-map-legend-close"
          aria-label="Ocultar semáforo"
          onClick={onHide}
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      <p className="ct-map-legend-subtitle">
        Se aplica a aeropuertos del mapa (no al peso de maletas)
      </p>
      <ul className="ct-map-legend-list">
        <li><span className="dot dot-green" />Verde: 0-69% de ocupación</li>
        <li><span className="dot dot-yellow" />Ámbar: 70-89% de ocupación</li>
        <li><span className="dot dot-red" />Rojo: 90-100% (riesgo de saturación)</li>
      </ul>
    </aside>
  )
}

export default CapacityLegendPanel
