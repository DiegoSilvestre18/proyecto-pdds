import { useState } from "react";

const MOCK_AIRLINES = [
  { id: "AL-001", name: "LATAM Airlines" },
  { id: "AL-002", name: "Iberia" },
  { id: "AL-003", name: "Air France" },
  { id: "AL-004", name: "Japan Airlines" },
  { id: "AL-005", name: "Emirates" },
];

const MOCK_SHIPMENTS = [
  {
    id: "ENV-10421",
    origin: "LIM",
    dest: "MAD",
    bags: 12,
    airline: "LATAM Airlines",
    status: "en tránsito",
    sla: "green",
  },
  {
    id: "ENV-10422",
    origin: "CDG",
    dest: "DEL",
    bags: 8,
    airline: "Air France",
    status: "en tránsito",
    sla: "amber",
  },
  {
    id: "ENV-10423",
    origin: "HND",
    dest: "CBR",
    bags: 5,
    airline: "Japan Airlines",
    status: "pendiente",
    sla: "green",
  },
  {
    id: "ENV-10424",
    origin: "BOG",
    dest: "EZE",
    bags: 20,
    airline: "LATAM Airlines",
    status: "en tránsito",
    sla: "red",
  },
  {
    id: "ENV-10425",
    origin: "MAD",
    dest: "LHR",
    bags: 3,
    airline: "Iberia",
    status: "entregado",
    sla: "green",
  },
  {
    id: "ENV-10426",
    origin: "RUH",
    dest: "PEK",
    bags: 15,
    airline: "Emirates",
    status: "en tránsito",
    sla: "amber",
  },
];

const MOCK_LIVE_ARRIVALS = [
  { time: "14:28:03", airport: "LIM", bags: 4 },
  { time: "14:28:11", airport: "CDG", bags: 7 },
  { time: "14:28:22", airport: "PEK", bags: 2 },
  { time: "14:28:35", airport: "MEX", bags: 9 },
];

function DayToDayConfig({
  isOpen,
  onClose,
  selectedAlgorithm,
  onAlgorithmChange,
}) {
  const [activeSection, setActiveSection] = useState("envios");

  if (!isOpen) {
    return null;
  }

  const sections = [
    { key: "envios", label: "Envíos" },
    { key: "registro", label: "Registrar" },
    { key: "vuelos", label: "Vuelos" },
    { key: "config", label: "Config" },
  ];

  return (
    <aside
      className="ct-scenario-config ct-scenario-config--vivo"
      aria-label="Configuración día a día"
    >
      <div className="ct-scenario-config__header">
        <div>
          <p className="ct-scenario-config__label">ESCENARIO ACTIVO</p>
          <h3 className="ct-scenario-config__title">Operación Día a Día</h3>
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
        {activeSection === "envios" && (
          <>
            <div className="ct-config-section">
              <p className="ct-config-section__title">LLEGADA EN TIEMPO REAL</p>
              <div className="ct-live-arrivals">
                {MOCK_LIVE_ARRIVALS.map((a) => (
                  <div key={a.time} className="ct-live-arrival">
                    <span className="ct-live-arrival__time">{a.time}</span>
                    <span className="ct-live-arrival__airport">
                      {a.airport}
                    </span>
                    <span className="ct-live-arrival__bags">
                      {a.bags} maletas
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ct-config-section">
              <p className="ct-config-section__title">ENVÍOS ACTIVOS</p>
              <div className="ct-shipment-list">
                {MOCK_SHIPMENTS.map((s) => (
                  <div key={s.id} className="ct-shipment-item">
                    <div className="ct-shipment-item__header">
                      <strong>{s.id}</strong>
                      <span className={`ct-sla-dot ct-sla-dot--${s.sla}`} />
                    </div>
                    <p className="ct-shipment-item__route">
                      {s.origin} → {s.dest} · {s.bags} maletas
                    </p>
                    <p className="ct-shipment-item__meta">
                      {s.airline} · <em>{s.status}</em>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection === "registro" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">REGISTRAR NUEVO ENVÍO</p>
            <form
              className="ct-config-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="ct-config-form__label">
                Aerolínea
                <select className="ct-config-form__select">
                  <option value="">Seleccionar...</option>
                  {MOCK_AIRLINES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ct-config-form__label">
                Origen
                <select className="ct-config-form__select">
                  <option value="">Aeropuerto origen...</option>
                  <option value="LIM">LIM - Lima</option>
                  <option value="BOG">BOG - Bogotá</option>
                  <option value="CDG">CDG - París</option>
                  <option value="PEK">PEK - Pekín</option>
                  <option value="HND">HND - Tokio</option>
                </select>
              </label>
              <label className="ct-config-form__label">
                Destino
                <select className="ct-config-form__select">
                  <option value="">Aeropuerto destino...</option>
                  <option value="MAD">MAD - Madrid</option>
                  <option value="EZE">EZE - Buenos Aires</option>
                  <option value="DEL">DEL - Nueva Delhi</option>
                  <option value="LHR">LHR - Londres</option>
                  <option value="CBR">CBR - Canberra</option>
                </select>
              </label>
              <label className="ct-config-form__label">
                Cantidad de maletas
                <input
                  type="number"
                  className="ct-config-form__input"
                  min="1"
                  max="50"
                  defaultValue="1"
                />
              </label>
              <button type="submit" className="ct-config-form__submit">
                Registrar envío
              </button>
            </form>
          </div>
        )}

        {activeSection === "vuelos" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">CANCELAR VUELO</p>
            <p className="ct-config-hint">
              Seleccione un vuelo en curso para simular cancelación. Las maletas
              afectadas serán replanificadas.
            </p>
            <div className="ct-cancel-list">
              <div className="ct-cancel-item">
                <span>IAD → LHR</span>
                <span>42 maletas</span>
                <button type="button" className="ct-cancel-btn">
                  Cancelar
                </button>
              </div>
              <div className="ct-cancel-item">
                <span>CDG → DEL</span>
                <span>38 maletas</span>
                <button type="button" className="ct-cancel-btn">
                  Cancelar
                </button>
              </div>
              <div className="ct-cancel-item">
                <span>PEK → HND</span>
                <span>25 maletas</span>
                <button type="button" className="ct-cancel-btn">
                  Cancelar
                </button>
              </div>
            </div>
            <div className="ct-config-alert ct-config-alert--info">
              <strong>Nota:</strong> Al cancelar, el planificador reasignará
              automáticamente las maletas a vuelos alternativos (R-091).
            </div>
          </div>
        )}

        {activeSection === "config" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">ALGORITMO PLANIFICADOR</p>
            <div className="ct-algorithm-selector">
              <label className="ct-algorithm-option">
                <input
                  type="radio"
                  name="algorithm"
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
                  name="algorithm"
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

            <p
              className="ct-config-section__title"
              style={{ marginTop: "16px" }}
            >
              🚦 SEMÁFORO DE MALETAS
            </p>
            <div className="ct-sla-legend">
              <div className="ct-sla-legend__item">
                <span className="ct-sla-dot ct-sla-dot--green" />
                <span>Verde: &lt;70% del plazo</span>
              </div>
              <div className="ct-sla-legend__item">
                <span className="ct-sla-dot ct-sla-dot--amber" />
                <span>Ámbar: 70-95% del plazo</span>
              </div>
              <div className="ct-sla-legend__item">
                <span className="ct-sla-dot ct-sla-dot--red" />
                <span>Rojo: &gt;95% o retrasada</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default DayToDayConfig;
