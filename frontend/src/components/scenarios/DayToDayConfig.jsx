import { useState, useMemo } from "react";

// ── DayToDayConfig — Panel del escenario "Operación Día a Día" ──────────────
// Muestra monitoreo en vivo y permite iniciar la simulación con la fecha real
// del dispositivo. No expone selector de fecha ni rango — eso es para "Periodo".

function DayToDayConfig({
  isOpen,
  onClose,
  selectedAlgorithm,
  onAlgorithmChange,
  activeShipments,
  totalBagsWaiting,
  currentEpochTime,
  simState,
  liveStatus,
  onStartDayToDay,
  onReset,
}) {
  // ── Todos los hooks PRIMERO (antes de cualquier return condicional) ─────────
  const [activeSection, setActiveSection] = useState("envios");

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }, []);

  // ── Early return DESPUÉS de todos los hooks ───────────────────────────────
  if (!isOpen) return null;

  const isRunning   = simState === "running";
  const isCompleted = simState === "completed";

  const sections = [
    { key: "envios",  label: "Monitor" },
    { key: "vuelos",  label: "Vuelos" },
    { key: "config",  label: "Config" },
  ];

  return (
    <aside className="ct-scenario-config ct-scenario-config--vivo" aria-label="Configuración día a día">

      {/* Header */}
      <div className="ct-scenario-config__header">
        <div>
          <p className="ct-scenario-config__label">ESCENARIO ACTIVO</p>
          <h3 className="ct-scenario-config__title">Operación Día a Día</h3>
        </div>
        <button type="button" className="ct-scenario-config__close" onClick={onClose}>✕</button>
      </div>

      {/* Nav */}
      <nav className="ct-scenario-config__nav">
        {sections.map(s => (
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

        {/* ── INICIAR / ESTADO ─────────────────────────────────────────────── */}
        <div className="ct-config-section" style={{ marginBottom: 0 }}>
          {!isRunning && !isCompleted ? (
          <>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
              Fecha de hoy: <strong style={{ color: "#818cf8" }}>{todayStr}</strong>
              {" · "}Algoritmo: <strong style={{ color: "#818cf8" }}>{selectedAlgorithm?.toUpperCase()}</strong>
            </p>
            <button
              id="dtd-btn-start"
              type="button"
              onClick={() => onStartDayToDay && onStartDayToDay(todayStr, 1)}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
                boxShadow: "0 4px 15px rgba(16,185,129,0.35)",
                letterSpacing: 0.5,
              }}
            >
              ▶ INICIAR OPERACIÓN
            </button>
          </>
        ) : isRunning ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <span style={{ color: "#10b981", fontSize: 13, fontWeight: 700 }}>
              ● EN OPERACIÓN — Día {liveStatus?.currentDay ?? 1}
            </span>
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginTop: 8 }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: `${liveStatus?.percent ?? 0}%`,
                background: "linear-gradient(90deg, #4f46e5, #10b981)",
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <span style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>✓ Operación completada</span>
            <button
              id="dtd-btn-reset"
              type="button"
              onClick={() => onReset && onReset()}
              style={{
                display: "block", width: "100%", marginTop: 8,
                padding: "8px 0", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent", color: "#94a3b8",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              ↩ Nueva operación
            </button>
          </div>
        )}
        </div>

        {/* ── SECCIÓN MONITOR ──────────────────────────────────────────────── */}
        {activeSection === "envios" && (
          <>
            <div className="ct-config-section">
              <p className="ct-config-section__title">📦 MALETAS EN ESPERA</p>
              <div style={{ padding: "14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, textAlign: "center" }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#10b981" }}>
                  {(totalBagsWaiting ?? 0).toLocaleString("es-PE")}
                </span>
                <span style={{ display: "block", fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                  maletas esperando en almacenes
                </span>
              </div>
            </div>

            <div className="ct-config-section">
              <p className="ct-config-section__title">✈️ VENTANA MÓVIL (24H)</p>
              <div className="ct-shipment-list">
                {(!activeShipments || activeShipments.length === 0) ? (
                  <div style={{ padding: "20px", textAlign: "center", opacity: 0.5, fontSize: 12 }}>
                    Esperando próxima ventana de vuelos...
                  </div>
                ) : activeShipments.slice(0, 6).map(s => {
                  const depDate = new Date(s.departureTime);
                  const depFmt  = depDate.toLocaleTimeString("en-GB",
                    { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
                  const colors  = { cancelled: "#ef4444", rescued: "#3b82f6",
                                    blocked: "#f59e0b", critical: "#f97316" };
                  const dot     = colors[s.status] ?? "#10b981";
                  return (
                    <div key={`s-${s.id}`} className="ct-shipment-item">
                      <div className="ct-shipment-item__header">
                        <strong>Vuelo {s.id}</strong>
                        <span className="ct-sla-dot" style={{ background: dot }} title={s.status} />
                      </div>
                      <p className="ct-shipment-item__route">{s.from} → {s.to} · {depFmt}</p>
                      <p className="ct-shipment-item__meta">
                        {s.status?.toUpperCase()} · <em>Cap: {s.capacityPercent?.toFixed(1)}%</em>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── SECCIÓN VUELOS ───────────────────────────────────────────────── */}
        {activeSection === "vuelos" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">CANCELAR VUELO</p>
            <p className="ct-config-hint">
              Seleccione un vuelo en curso para simular cancelación. Las maletas afectadas serán replanificadas.
            </p>
            <div className="ct-cancel-list">
              {["IAD → LHR", "CDG → DEL", "PEK → HND"].map((ruta, i) => (
                <div key={i} className="ct-cancel-item">
                  <span>{ruta}</span>
                  <span>{[42, 38, 25][i]} maletas</span>
                  <button type="button" className="ct-cancel-btn">Cancelar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECCIÓN CONFIG ───────────────────────────────────────────────── */}
        {activeSection === "config" && (
          <div className="ct-config-section">
            <p className="ct-config-section__title">ALGORITMO PLANIFICADOR</p>
            <div className="ct-algorithm-selector">
              {[{ val: "hga", label: "Algoritmo A — HGA", sub: "Hybrid Genetic Algorithm" },
                { val: "alns", label: "Algoritmo B — ALNS", sub: "Adaptive Large Neighborhood Search" }
              ].map(opt => (
                <label key={opt.val} className="ct-algorithm-option">
                  <input
                    type="radio"
                    name="algorithm-dtd"
                    value={opt.val}
                    checked={selectedAlgorithm === opt.val}
                    onChange={() => onAlgorithmChange(opt.val)}
                  />
                  <div>
                    <strong>{opt.label}</strong>
                    <span>{opt.sub}</span>
                  </div>
                </label>
              ))}
            </div>

            <p className="ct-config-section__title" style={{ marginTop: 16 }}>🚦 SEMÁFORO DE MALETAS</p>
            <div className="ct-sla-legend">
              {[
                { cls: "green",  label: "Verde: <70% del plazo" },
                { cls: "amber",  label: "Ámbar: 70-95% del plazo" },
                { cls: "red",    label: "Rojo: >95% o retrasada" },
              ].map(item => (
                <div key={item.cls} className="ct-sla-legend__item">
                  <span className={`ct-sla-dot ct-sla-dot--${item.cls}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}

export default DayToDayConfig;
