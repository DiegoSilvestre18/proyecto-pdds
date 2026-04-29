import { useState } from "react";

function PeriodSimConfig({
  isOpen,
  onClose,
  selectedAlgorithm,
  onAlgorithmChange,
}) {
  const [duration, setDuration] = useState(5);
  const [activeSection, setActiveSection] = useState("config");

  if (!isOpen) {
    return null;
  }

  const sections = [
    { key: "config", label: "Configurar" },
    { key: "params", label: "Parámetros" },
    { key: "cancelaciones", label: "Cancelaciones" },
    { key: "resultados", label: "Progreso" },
  ];

  return (
    <aside
      className="ct-scenario-config ct-scenario-config--periodo"
      aria-label="Configuración simulación de periodo"
    >
      <div className="ct-scenario-config__header ct-scenario-config__header--periodo">
        <div>
          <p className="ct-scenario-config__label">ESCENARIO ACTIVO</p>
          <h3 className="ct-scenario-config__title">Simulación de Periodo</h3>
        </div>
        <button
          type="button"
          className="ct-scenario-config__close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <nav className="ct-scenario-config__nav">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`ct-scenario-config__nav-btn ${activeSection === s.key ? "ct-scenario-config__nav-btn--active" : ""}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="ct-scenario-config__body">
        {activeSection === "config" && (
          <>
            <div className="ct-config-section">
              <p className="ct-config-section__title">DURACIÓN DE SIMULACIÓN</p>
              <div className="ct-duration-chips">
                {[3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`ct-duration-chip ${duration === d ? "ct-duration-chip--active" : ""}`}
                    onClick={() => setDuration(d)}
                  >
                    {d} días
                  </button>
                ))}
              </div>
              <p className="ct-config-hint">
                La simulación procesará {duration} días de operaciones en 30-90
                minutos reales.
              </p>
            </div>

            <div className="ct-config-section">
              <p className="ct-config-section__title">ALGORITMO</p>
              <div className="ct-algorithm-selector">
                <label className="ct-algorithm-option">
                  <input
                    type="radio"
                    name="algo-period"
                    value="hga"
                    checked={selectedAlgorithm === "hga"}
                    onChange={() => onAlgorithmChange("hga")}
                  />
                  <div>
                    <strong>Algoritmo A — HGA</strong>
                    <span>Hybrid Genetic Algorithm</span>
                  </div>
                </label>
                <label className="ct-algorithm-option">
                  <input
                    type="radio"
                    name="algo-period"
                    value="alns"
                    checked={selectedAlgorithm === "alns"}
                    onChange={() => onAlgorithmChange("alns")}
                  />
                  <div>
                    <strong>Algoritmo B — ALNS</strong>
                    <span>Adaptive Large Neighborhood Search</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="ct-config-section">
              <button type="button" className="ct-sim-start-btn">
                ▶ Iniciar simulación de {duration} días
              </button>
            </div>
          </>
        )}

        {activeSection === "params" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">
              🔧 PARÁMETROS DEL ALGORITMO
            </p>
            <form
              className="ct-config-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="ct-config-form__label">
                Tamaño de población
                <input
                  type="number"
                  className="ct-config-form__input"
                  min="10"
                  max="500"
                  defaultValue="100"
                />
              </label>
              <label className="ct-config-form__label">
                Tasa de mutación
                <input
                  type="number"
                  className="ct-config-form__input"
                  step="0.01"
                  min="0"
                  max="1"
                  defaultValue="0.15"
                />
              </label>
              <label className="ct-config-form__label">
                Generaciones máximas
                <input
                  type="number"
                  className="ct-config-form__input"
                  min="50"
                  max="5000"
                  defaultValue="1000"
                />
              </label>
              <label className="ct-config-form__label">
                Tamaño de vecindario (ALNS)
                <input
                  type="number"
                  className="ct-config-form__input"
                  min="5"
                  max="100"
                  defaultValue="30"
                />
              </label>
              <label className="ct-config-form__label">
                Tiempo carga/descarga (min virtuales)
                <input
                  type="number"
                  className="ct-config-form__input"
                  min="1"
                  max="30"
                  defaultValue="5"
                />
              </label>
            </form>
          </div>
        )}

        {activeSection === "cancelaciones" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">INYECTAR CANCELACIONES</p>
            <p className="ct-config-hint">
              Cargue un archivo con cancelaciones de vuelos múltiples para
              evaluar la respuesta del planificador bajo estrés.
            </p>
            <div className="ct-file-upload">
              <label className="ct-file-upload__label">
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="ct-file-upload__input"
                />
                <span className="ct-file-upload__btn">
                  📁 Seleccionar archivo
                </span>
                <span className="ct-file-upload__name">
                  Ningún archivo seleccionado
                </span>
              </label>
            </div>
            <button
              type="button"
              className="ct-config-form__submit"
              style={{ marginTop: "12px" }}
            >
              Cargar cancelaciones
            </button>
            <div
              className="ct-config-alert ct-config-alert--warning"
              style={{ marginTop: "12px" }}
            >
              <strong>Formato:</strong> Una cancelación por línea:{" "}
              <code>VUELO_ID,HORA</code>
            </div>
          </div>
        )}

        {activeSection === "resultados" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">
              📊 PROGRESO DE SIMULACIÓN
            </p>
            <div className="ct-progress-detail">
              <div className="ct-progress-detail__item">
                <span>Día simulado</span>
                <strong>Día 4 / {duration}</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Progreso</span>
                <strong>78%</strong>
              </div>
              <div className="ct-progress-bar">
                <div
                  className="ct-progress-bar__fill ct-progress-bar__fill--amber"
                  style={{ width: "78%" }}
                />
              </div>
              <div className="ct-progress-detail__item">
                <span>Tiempo real transcurrido</span>
                <strong>00:49:10</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Fecha simulada</span>
                <strong>2026-04-12 09:16 UTC</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Vuelos cancelados procesados</span>
                <strong>3</strong>
              </div>
              <div className="ct-progress-detail__item">
                <span>Maletas replanificadas</span>
                <strong>127</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default PeriodSimConfig;
