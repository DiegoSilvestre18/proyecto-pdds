import { useState, useMemo } from "react";

// ── DayToDayConfig — Panel del escenario "Operación Día a Día" ──────────────
// Muestra monitoreo en vivo y permite iniciar la simulación con la fecha real
// del dispositivo. No expone selector de fecha ni rango — eso es para "Periodo".

function DayToDayConfig({
  isOpen,
  onClose,
  selectedAlgorithm,
  activeShipments,
  totalBagsWaiting,
  simState,
  liveStatus,
  onStartDayToDay,
  onReset,
  sessionId,
}) {
  // ── Todos los hooks PRIMERO (antes de cualquier return condicional) ─────────
  const [activeSection, setActiveSection] = useState("envios");
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }, []);

  // ── Early return DESPUÉS de todos los hooks ───────────────────────────────
  if (!isOpen) return null;

  const isRunning   = simState === "running" || liveStatus?.status === "RUNNING";
  const isCompleted = simState === "completed" || liveStatus?.status === "DONE";

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
            {/* Card de estado */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))',
              border: '1px solid rgba(16,185,129,0.22)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📡</div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#10b981', letterSpacing: 0.5 }}>
                  Sincronización en Vivo
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                  Fecha: <strong style={{ color: '#94a3b8' }}>{todayStr}</strong> · Hora sincronizada con servidor
                </p>
              </div>
            </div>

            <div style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              background: "rgba(16,185,129,0.1)",
              color: "#10b981", fontWeight: 700, fontSize: 13, textAlign: "center",
              letterSpacing: 0.5, border: "1px solid rgba(16,185,129,0.2)"
            }}>
              Estableciendo conexión en vivo...
            </div>
          </>
        ) : isRunning ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <span style={{ color: "#10b981", fontSize: 13, fontWeight: 700 }}>
              📡 TRANSMITIENDO EN VIVO — {new Date(todayStr + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}
            </span>
            <div
              style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginTop: 8 }}
              role="progressbar"
              aria-valuenow={Math.round(liveStatus?.percent ?? 0)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de transmisión en vivo"
            >
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
            <span style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>Monitoreo finalizado</span>
            <button
              id="dtd-btn-reset"
              type="button"
              onClick={() => {
                if (onReset) onReset();
              }}
              style={{
                display: "block", width: "100%", marginTop: 8,
                padding: "8px 0", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent", color: "#94a3b8",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              ↩ Reiniciar conexión
            </button>
          </div>
        )}
        </div>

        {/* ── SECCIÓN MONITOR ──────────────────────────────────────────────── */}
        {activeSection === "envios" && (
          <>
            <div className="ct-config-section">
              <p className="ct-config-section__title">📦 MALETAS EN ESPERA</p>
              <div style={{
                padding: "10px 12px", background: "rgba(16,185,129,0.07)",
                borderRadius: 7, textAlign: "center",
                border: '1px solid rgba(16,185,129,0.18)',
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>
                  {(totalBagsWaiting ?? 0).toLocaleString("es-PE")}
                </span>
                <span style={{ display: "block", fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  maletas en almacenes
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
                  const depFmt  = depDate.toLocaleTimeString("es-PE",
                    { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
                  const colors  = { cancelled: "#ef4444", rescued: "#3b82f6",
                                    blocked: "#f59e0b", critical: "#f97316" };
                  const dot     = colors[s.status] ?? "#10b981";
                  return (
                    <div key={`s-${s.id}`} className="ct-shipment-item">
                      <div className="ct-shipment-item__header">
                        <strong>Vuelo {s.id.toString().replace("vuelo-", "").split("-")[0]}</strong>
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

            {/* Resumen de métricas del día cuando hay simulación activa */}
            {liveStatus && (
              <div className="ct-config-section" style={{ marginTop: 4 }}>
                <p className="ct-config-section__title">📊 RESUMEN DEL DÍA</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    {
                      label: 'Vuelos activos',
                      value: liveStatus.activeRoutes?.length ?? 0,
                      color: '#818cf8',
                    },
                    {
                      label: 'SLA cumplido',
                      value: liveStatus.slaPercent != null ? `${liveStatus.slaPercent.toFixed(1)}%` : '—',
                      color: (liveStatus.slaPercent ?? 100) >= 85 ? '#10b981' : '#f97316',
                    },
                    {
                      label: 'Maletas atendidas',
                      value: (liveStatus.totalAttended ?? 0).toLocaleString('es-PE'),
                      color: '#34d399',
                    },
                    {
                      label: 'Maletas perdidas',
                      value: (liveStatus.totalMissed ?? 0).toLocaleString('es-PE'),
                      color: (liveStatus.totalMissed ?? 0) > 0 ? '#ef4444' : '#34d399',
                    },
                    {
                      label: 'Nodos críticos',
                      value: liveStatus.criticalNodes ?? 0,
                      color: (liveStatus.criticalNodes ?? 0) > 3 ? '#f97316' : '#94a3b8',
                    },
                    {
                      label: 'Ocupación global',
                      value: liveStatus.globalOccupancy != null ? `${liveStatus.globalOccupancy.toFixed(1)}%` : '—',
                      color: (liveStatus.globalOccupancy ?? 0) >= 90 ? '#ef4444' : '#818cf8',
                    },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${item.color}22`,
                      borderRadius: 6,
                      padding: '6px 8px', textAlign: 'center',
                    }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: item.color }}>
                        {item.value}
                      </p>
                      <p style={{ margin: 0, fontSize: 8, color: '#64748b', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Barra de progreso */}
                {liveStatus.percent != null && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                      <span>
                        {liveStatus.simulatedTime?.includes(" - ") 
                          ? `Hoy - ${liveStatus.simulatedTime.split(" - ")[1]}` 
                          : "Transmisión en Vivo"}
                      </span>
                      <span style={{ color: liveStatus.status === 'DONE' ? '#10b981' : '#818cf8', fontWeight: 700 }}>
                        {liveStatus.status === 'DONE' ? '✓ Completado' : `${liveStatus.percent}%`}
                      </span>
                    </div>
                    <div
                      style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}
                      role="progressbar"
                      aria-valuenow={Math.round(liveStatus.percent ?? 0)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progreso de la operación en vivo"
                    >
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${liveStatus.percent ?? 0}%`,
                        background: liveStatus.status === 'DONE'
                          ? 'linear-gradient(90deg,#10b981,#34d399)'
                          : 'linear-gradient(90deg,#4f46e5,#818cf8)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SECCIÓN VUELOS ───────────────────────────────────────────────── */}
        {activeSection === "vuelos" && (
          <div className="ct-config-section">
            {/* Si no está corriendo la simulación, configurar cancelaciones previas */}
            {!isRunning && !isCompleted && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '14px 16px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#818cf8',
                  letterSpacing: '0.5px',
                  opacity: 0.5
                }}>
                  ⚙️ CONFIGURAR CANCELACIONES PREVIAS (DESHABILITADO)
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                  Esta función ha sido deshabilitada. Utiliza el panel de control durante la simulación para cancelaciones manuales.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── SECCIÓN CONFIG ───────────────────────────────────────────────── */}
        {activeSection === "config" && (
          <div className="ct-config-section">
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
