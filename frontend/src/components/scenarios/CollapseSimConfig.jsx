import { useState } from 'react'

const COLLAPSE_LOG = [
  { time: '2026-04-13 18:42', node: 'ALM-BOG', type: 'almacén', detail: 'Almacén Bogotá alcanzó 100% (800/800 maletas)' },
  { time: '2026-04-13 19:15', node: 'ALM-LIM', type: 'almacén', detail: 'Almacén Lima alcanzó 100% (650/650 maletas)' },
  { time: '2026-04-13 20:03', node: 'VUE-CDG-DEL', type: 'vuelo', detail: 'Vuelo CDG→DEL no puede descargar: destino saturado' },
  { time: '2026-04-13 21:30', node: 'ALM-MEX', type: 'almacén', detail: 'Almacén C. de México alcanzó 100% (720/720 maletas)' },
  { time: '2026-04-13 22:48', node: 'ALM-MAD', type: 'almacén', detail: 'Almacén Madrid alcanzó 98% (588/600 maletas)' },
  { time: '2026-04-14 01:12', node: 'ALM-PEK', type: 'almacén', detail: 'Almacén Pekín alcanzó 100% (500/500 maletas)' },
  { time: '2026-04-14 03:42', node: 'SISTEMA', type: 'colapso', detail: '⚠ PUNTO DE COLAPSO: 14/17 almacenes saturados, 6 vuelos bloqueados' },
]

const SLA_VIOLATIONS = [
  { id: 'ENV-10450', origin: 'CDG', dest: 'HND', hours: 52, sla: 48, status: 'Excedido +4h' },
  { id: 'ENV-10461', origin: 'LIM', dest: 'MAD', hours: 51, sla: 48, status: 'Excedido +3h' },
  { id: 'ENV-10478', origin: 'BOG', dest: 'DEL', hours: 56, sla: 48, status: 'Excedido +8h' },
  { id: 'ENV-10490', origin: 'MEX', dest: 'PEK', hours: 49, sla: 48, status: 'Excedido +1h' },
  { id: 'ENV-10502', origin: 'IAD', dest: 'FCO', hours: 26, sla: 24, status: 'Excedido +2h (mismo cont.)' },
]

function CollapseSimConfig({ isOpen, onClose, selectedAlgorithm, onAlgorithmChange }) {
  const [activeSection, setActiveSection] = useState('config')

  if (!isOpen) {
    return null
  }

  const sections = [
    { key: 'config', label: 'Configurar' },
    { key: 'bitacora', label: 'Bitácora' },
    { key: 'sla', label: 'SLA' },
    { key: 'progreso', label: 'Progreso' },
  ]

  return (
    <aside className="ct-scenario-config ct-scenario-config--colapso" aria-label="Configuración simulación de colapso">
      <div className="ct-scenario-config__header ct-scenario-config__header--colapso">
        <div>
          <p className="ct-scenario-config__label">ESCENARIO ACTIVO</p>
          <h3 className="ct-scenario-config__title">Simulación de Colapso</h3>
        </div>
        <button type="button" className="ct-scenario-config__close ct-scenario-config__close--light" onClick={onClose}>✕</button>
      </div>

      <nav className="ct-scenario-config__nav ct-scenario-config__nav--colapso">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`ct-scenario-config__nav-btn ${activeSection === s.key ? 'ct-scenario-config__nav-btn--active ct-scenario-config__nav-btn--colapso-active' : ''}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="ct-scenario-config__body">
        {activeSection === 'config' && (
          <>
            <div className="ct-config-section">
              <p className="ct-config-section__title">📅 FECHA DE INICIO</p>
              <input type="date" className="ct-config-form__input" defaultValue="2026-04-09" />
            </div>

            <div className="ct-config-section">
              <p className="ct-config-section__title">📈 TASA ACELERADA DE INGRESO</p>
              <p className="ct-config-hint">Factor multiplicador de maletas por hora para simular estrés operativo.</p>
              <div className="ct-stress-slider">
                <input type="range" min="1" max="10" defaultValue="5" step="0.5" className="ct-stress-slider__input" />
                <div className="ct-stress-slider__labels">
                  <span>×1 Normal</span>
                  <span>×5</span>
                  <span>×10 Extremo</span>
                </div>
              </div>
            </div>

            <div className="ct-config-section">
              <p className="ct-config-section__title">📂 CARGA DESDE ARCHIVO</p>
              <div className="ct-file-upload">
                <label className="ct-file-upload__label">
                  <input type="file" accept=".txt,.csv" className="ct-file-upload__input" />
                  <span className="ct-file-upload__btn">📁 Cargar paquetes y almacenes</span>
                </label>
              </div>
            </div>

            <div className="ct-config-section">
              <p className="ct-config-section__title">⚙️ ALGORITMO</p>
              <div className="ct-algorithm-selector">
                <label className="ct-algorithm-option">
                  <input
                    type="radio"
                    name="algo-collapse"
                    value="hga"
                    checked={selectedAlgorithm === 'hga'}
                    onChange={() => onAlgorithmChange('hga')}
                  />
                  <div>
                    <strong>Algoritmo A — HGA</strong>
                    <span>Hybrid Genetic Algorithm</span>
                  </div>
                </label>
                <label className="ct-algorithm-option">
                  <input
                    type="radio"
                    name="algo-collapse"
                    value="alns"
                    checked={selectedAlgorithm === 'alns'}
                    onChange={() => onAlgorithmChange('alns')}
                  />
                  <div>
                    <strong>Algoritmo B — ALNS</strong>
                    <span>Adaptive Large Neighborhood Search</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="ct-config-section">
              <button type="button" className="ct-sim-start-btn ct-sim-start-btn--danger">
                ⚠ Iniciar simulación de colapso
              </button>
            </div>
          </>
        )}

        {activeSection === 'bitacora' && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">📋 BITÁCORA DE COLAPSO</p>
            <p className="ct-config-hint">
              Registro del nodo y hora exacta de cada saturación (R-005).
            </p>
            <div className="ct-collapse-log">
              {COLLAPSE_LOG.map((entry, i) => (
                <div
                  key={i}
                  className={`ct-collapse-log__entry ct-collapse-log__entry--${entry.type}`}
                >
                  <span className="ct-collapse-log__time">{entry.time}</span>
                  <span className="ct-collapse-log__node">{entry.node}</span>
                  <p className="ct-collapse-log__detail">{entry.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'sla' && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">🚨 MALETAS QUE SUPERARON SLA</p>
            <p className="ct-config-hint">
              Maletas que excedieron 24h (mismo continente) o 48h (distinto continente).
            </p>
            <div className="ct-sla-violations">
              {SLA_VIOLATIONS.map((v) => (
                <div key={v.id} className="ct-sla-violation">
                  <div className="ct-sla-violation__header">
                    <strong>{v.id}</strong>
                    <span className="ct-sla-violation__badge">{v.status}</span>
                  </div>
                  <p>{v.origin} → {v.dest} · {v.hours}h / {v.sla}h SLA</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'progreso' && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">📊 PROGRESO HASTA COLAPSO</p>
            <div className="ct-progress-detail">
              <div className="ct-progress-detail__item">
                <span>Estado</span>
                <strong className="ct-text-red">⚠ COLAPSADO</strong>
              </div>
              <div className="ct-progress-bar">
                <div className="ct-progress-bar__fill ct-progress-bar__fill--red" style={{ width: '96%' }} />
              </div>
              <div className="ct-progress-detail__item">
                <span>Tiempo real transcurrido</span>
                <strong>01:12:38</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Fecha simulada colapso</span>
                <strong>2026-04-14 03:42 UTC</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Almacenes saturados</span>
                <strong className="ct-text-red">14 / 17</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Vuelos bloqueados</span>
                <strong className="ct-text-red">6</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Maletas sin entregar</span>
                <strong className="ct-text-red">1,116</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Primer nodo saturado</span>
                <strong>ALM-BOG (18:42)</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default CollapseSimConfig
